require 'rubygems'
require 'sinatra'
require 'yaml'
require 'json'

get "/" do
  redirect '/index.html'
end

post "/edit" do
  yaml_file = File.join(File.dirname(__FILE__), 'pattern.yml')
  pattern = YAML.load_file(yaml_file)
  pattern[:notes][params[:id].to_i] = params[:x].to_i * 12 + params[:y].to_i
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