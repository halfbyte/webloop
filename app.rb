require 'rubygems'
require 'sinatra'
require 'yaml'
require 'json'

get "/" do
  redirect '/index.html'
end

post "/edit/:type/:id" do
  yaml_file = File.join(File.dirname(__FILE__), 'pattern.yml')
  pattern = YAML.load_file(yaml_file)
  puts params[:type].inspect
  puts params[:data].inspect
  if params[:x] && params[:y]
    pattern[params[:type]] = [] * 16 if pattern[params[:type]].nil?
    pattern[params[:type]][params[:id].to_i] = {} if pattern[params[:type]][params[:id].to_i].nil?
    pattern[params[:type]][params[:id].to_i]['x'] = params[:x].to_i
    pattern[params[:type]][params[:id].to_i]['y'] = params[:y].to_i
  elsif params[:clear]
    pattern[params[:type]][params[:id].to_i] = nil
  end
  File.open(yaml_file, 'w') do |f|
    YAML.dump(pattern, f)
  end
  content_type 'application/json'
  pattern.to_json
end

get "/update" do
  yaml_file = File.join(File.dirname(__FILE__), 'pattern.yml')
  pattern = YAML.load_file(yaml_file)
  content_type 'application/json'
  pattern.to_json  
end

get "/playlist.m3u8" do
  content_type 'application/vnd.apple.mpegurl'
  playlist = ""
  File.open(File.join(File.dirname(__FILE__),'test.m3u8'), 'r') do |f|
    playlist = f.read
  end
  playlist
end

get '/screen.css' do
  header 'Content-Type' => 'text/css; charset=utf-8'
  sass :screen
end