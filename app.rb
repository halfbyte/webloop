require 'rubygems'
require 'sinatra'
require 'yaml'
require 'json'
require 'haml'
require 'mongo'

database = nil
config = {
  'host' => 'localhost',
}
config_path = File.join(File.dirname(__FILE__), 'mongodb.yml');
if (File.exist?(config_path))
  config = config.merge(YAML.load_file(config_path))
end
database = Mongo::Connection.from_uri("mongodb://#{config['username']}:#{config['password']}@#{config['host']}").db('webloop');


DEFAULTS = {
  :not => {:x => 2, :y => 0},
  :snd => {:x => 8, :y => 8},
  :env => {:x => 5, :y => 5},
  :mod => {:x => 8, :y => 8},
  :trg => false
}

EMPTY_TRACK = {
  :trg => [false] * 16,
  :snd => [nil] * 16,
  :env => [nil] * 16,
  :not => [nil] * 16,
  :mod => [nil] * 16
}

get "/" do
  @rooms = database['rooms'].find();
  haml :index
end

post "/room/new" do
  name = params[:name]
  room = {
    :name => params[:name],
    :l => EMPTY_TRACK,
    :r => EMPTY_TRACK,
    :s => EMPTY_TRACK,
    :n => EMPTY_TRACK
  }
  id = database['rooms'].save(room);
  redirect "/rooms/#{id}"
end

get "/rooms/:room" do
  @room = database['rooms'].find_one(BSON::ObjectID.from_string(params[:room]));
  haml :room
end

post "/clear/:room/:track/:type" do
  objId = BSON::ObjectID.from_string(params[:room])
  @room = database['rooms'].find_one(objId)
  @room[params[:track]] = {} if @room[params[:track]].nil?
  @room[params[:track]][params[:type]] = [nil] * 16
  @room[params[:track]]['trg'] = [nil] * 16
  database['rooms'].save(@room)

  content_type 'application/json'
  @room.to_json
end

post "/edit/:room/:track/:type/:id" do
  track = params[:track]
  type = params[:type]
  id = params[:id].to_i
  objId = BSON::ObjectID.from_string(params[:room])
  @room = database['rooms'].find_one(objId)
    
  @room[track][type] = [nil] * 16 if @room[track][type].empty?
  @room[track]['trg'] = [false] * 16 if @room[track]['trg'].empty?
  if params[:clear]
    @room[track][type][id] = nil
    @room[track]['trg'][id] = false
  else
    @room[track][type][id] = {:x => params[:x].to_i, :y => params[:y].to_i}
    @room[track]['trg'][id] = true
  end  
  database['rooms'].save(@room, :safe => true)

  content_type 'application/json'
  @room.to_json
end

get "/update/:room" do
  @room = database['rooms'].find_one(BSON::ObjectID.from_string(params[:room]))
  content_type 'application/json'
  @room.to_json
end

get '/screen.css' do
  content_type 'text/css', :charset => 'utf-8'
  sass :screen
end