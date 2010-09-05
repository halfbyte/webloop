require 'rubygems'
require 'sinatra'
require 'yaml'
require 'json'
require 'haml'

get "/" do
  redirect '/index.html'
end

post "/clear/:track/:type" do
  yaml_file = File.join(File.dirname(__FILE__), 'pattern.yml')
  pattern = YAML.load_file(yaml_file)
  puts params[:track].inspect
  puts params[:type].inspect
  pattern[params[:track]] = {} if pattern[params[:track]].nil?
  pattern[params[:track]][params[:type]] = [] * 16
  pattern[params[:track]]['trg'] = [] * 16
  File.open(yaml_file, 'w') do |f|
    YAML.dump(pattern, f)
  end
  content_type 'application/json'
  pattern.to_json
end

post "/edit/:track/:type/:id" do
  yaml_file = File.join(File.dirname(__FILE__), 'pattern.yml')
  pattern = YAML.load_file(yaml_file)
  puts params[:track].inspect
  puts params[:type].inspect
  puts params[:data].inspect
  if params[:x] && params[:y]
    pattern[params[:track]] = {} if pattern[params[:track]].nil?
    pattern[params[:track]]['trg'] = [] * 16 if pattern[params[:track]]['trg'].nil?
    pattern[params[:track]]['trg'][params[:id].to_i] = true
    pattern[params[:track]][params[:type]] = [] * 16 if pattern[params[:track]][params[:type]].nil?
    pattern[params[:track]][params[:type]][params[:id].to_i] = {} if pattern[params[:track]][params[:type]][params[:id].to_i].nil?
    pattern[params[:track]][params[:type]][params[:id].to_i]['x'] = params[:x].to_i
    pattern[params[:track]][params[:type]][params[:id].to_i]['y'] = params[:y].to_i
  elsif params[:clear]
    pattern[params[:track]][params[:type]][params[:id].to_i] = nil
    pattern[params[:track]]['trg'] = [] * 16 if pattern['trg'].nil?
    pattern[params[:track]]['trg'][params[:id].to_i] = nil
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

get '/screen.css' do
  content_type 'text/css', :charset => 'utf-8'
  sass :screen
end