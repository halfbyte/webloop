require 'sndlib'
require 'fileutils'
require 'yaml'

def midi_to_freq(note)
  440.0 * ( 2.0 ** ((note.to_f - 69.0) / 12))
end

# pattern = {
#   :notes => [
#     64, nil, nil, nil,
#     60, nil, 58, nil,
#     64, nil, nil, 65,
#     64, nil, nil, nil
#   ],
#   :length => [
#     16, nil, nil, nil,
#     16, nil, 4, nil,
#     8, nil, nil, 1,
#     8, nil, nil, nil,
#   ],
#   :sound => [
#     8, nil, nil, nil,
#     2, nil, 5, nil,
#     4, nil, nil, 12,
#     4, nil, nil, nil,
#   ]
# }
# 
# File.open( 'pattern.yaml', 'w' ) do |out|
#     YAML.dump( pattern, out )
# end

class MoogFilter  

  def initialize
    @in1 = @in2 = @in3 = @in4 = 0
    @out1 = @out2 = @out3 = @out4 = 0
  end
  
  def filter(input, fc, res)
    f = fc * 1.16;
    fb = res * (1.0 - 0.15 * f * f);
    input -= @out4 * fb;
    input *= 0.35013 * (f*f)*(f*f);
    @out1 = input + 0.3 * @in1 + (1 - f) * @out1; # Pole 1
    @in1  = input;
    @out2 = @out1 + 0.3 * @in2 + (1 - f) * @out2;  # Pole 2
    @in2  = @out1;
    @out3 = @out2 + 0.3 * @in3 + (1 - f) * @out3;  # Pole 3
    @in3  = @out2;
    @out4 = @out3 + 0.3 * @in4 + (1 - f) * @out4;  # Pole 4
    @in4  = @out3;
    return @out4;
  end
end

class BufferWriter
  include FileUtils
  def initialize(basename, file_size)
    puts "opening new stream with name #{basename}, filesize #{file_size}"
    @basename = basename
    @file_size = file_size
    @segment = 0
    @pointer_in_file = 0
    @pointer_in_buffer = 0
  end
  
  def update(buffer)
    puts "updating from buffer with size #{buffer.size}"
    open_file
    words_to_write = [(@file_size - @pointer_in_file), (buffer.length - @pointer_in_buffer)].min
    return if words_to_write == 0
    puts "words_to_write: #{words_to_write}"
    puts "writing #{@basename}_#{@segment} #{@pointer_in_buffer} > #{@pointer_in_buffer + words_to_write - 1}"
    mus_sound_write(@file, @pointer_in_buffer, @pointer_in_buffer + words_to_write - 1, 1, buffer)
    @pointer_in_buffer += words_to_write
    @pointer_in_file += words_to_write
    if @pointer_in_file >= @file_size
      close_file
    end
    open_file
    update(buffer) # writing out rests of buffer, if needed
    if (@pointer_in_buffer >= buffer.size)
      @pointer_in_buffer = 0
    end
  end
  
  def open_file
    unless @file
      @segment += 1
      @file = mus_sound_open_output("public/media/#{@basename}_#{@segment}.wav", 44100, 1, Mus_lshort, Mus_riff)
    end
  end
  
  def close_file
    mus_sound_close_output(@file, @file_size * 2)
    system "/usr/bin/ffmpeg -er 4 -y -i public/media/#{@basename}_#{@segment}.wav -f mpegts -acodec mp3 -ac 1 -ar 44100 -ab 64k public/media/#{@basename}_#{@segment}.ts"
    #system "/usr/bin/lame --preset"
    rm("public/media/#{@basename}_#{@segment}.wav")
    @file = nil
    @pointer_in_file = 0
    
    write_m3u8
    cleanup_old_files
    
    
    
  end
  
  def write_m3u8
    File.open("#{@basename}.m3u8", "w") do |file|
      file.puts "#EXTM3U"
      file.puts "#EXT-X-TARGETDURATION:5"
      file.puts "#EXT-X-ALLOW-CACHE:yes"
      min = 0
      if (@segment > 5)
        file.puts "#EXT-X-MEDIA-SEQUENCE:#{@segment - 5}"
        min = @segment - 5
      end
      min.upto(@segment) do |seg|
        file.puts "#EXTINF:5,"
        # you probably need to change this here:
        file.puts "http://halfmac.local:4567/media/#{@basename}_#{seg}.ts"
      end
    end
  end
  
  def cleanup_old_files
    if @segment > 5
      0.upto(@segment - 5) do |i|
        file_name = "public/media/#{@basename}_#{i}.ts"
        if File.exists?(file_name)
          rm(file_name)
        end
      end
    end
  end
  
end

STREAM_SEGMENT_LENGTH = 44_100 * 10

BPM = 125
freq = BPM.to_f / 60.to_f

buffer_length = (4 * 44_100 / freq).to_i
 
puts buffer_length


buffer = SoundData.new(1, buffer_length.to_i+1);

mus_srate = 44100

wave = make_sawtooth_wave(440)
env = make_env([0,1,1,0], 1, 0.3)
filter = MoogFilter.new
current_note = -1
filter_freq = 0
bw = BufferWriter.new("test", 44_100 * 5)

loop do
  pattern = YAML.load_file('pattern.yml')
  0.upto(buffer_length - 1) do |i|
    pos = i.to_f / (buffer_length / 16).to_f
    if (pos.to_i > current_note)
      current_note = pos.to_i
      if note = pattern[:notes][current_note]
        env = make_env([0,1,0.2,0], 1, (pattern[:length][current_note] || 4).to_f / 16.to_f)
        freq = midi_to_freq(pattern[:notes][current_note])
        freq = 22050 if freq > 22050        
        wave = make_sawtooth_wave(freq)
        filter_freq = (pattern[:sound][current_note] || 7).to_f / 16.to_f
      end
    end
    buffer[0,i] = filter.filter(sawtooth_wave(wave) * env(env), filter_freq, 3.4)
  end
  bw.update(buffer)
  current_note = -1
end

