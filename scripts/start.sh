# Original by: samuelfoxy
# Modified by: Rilshrink

copy_file() {
  # Check if file exists
  if [ ! -e $1 ]; then
      echo "$1 does not exist! Exiting."
      exit 1
  fi

  # Copy file
  cp $1 $2
}

echo "Setting up server"
rm -rf "/app/servers_data/servers/$MINEPLEX_SERVER_NAME"
mkdir -p "/app/servers_data/servers/$MINEPLEX_SERVER_NAME"

echo "Symlinking server files"
ln -s "$MINEPLEX_UPDATE_PATH" "/app/servers_data/update"

# Setup server jar
echo "Moving server jar and plugins"
copy_file "$MINEPLEX_JARS_PATH/spigot.jar" "/app/servers_data/servers/$MINEPLEX_SERVER_NAME/spigot.jar"
# Setup Plugin
mkdir "/app/servers_data/servers/$MINEPLEX_SERVER_NAME/plugins/"
copy_file "$MINEPLEX_PLUGIN_PATH/$MINEPLEX_PLUGIN" "/app/servers_data/servers/$MINEPLEX_SERVER_NAME/plugins/$MINEPLEX_PLUGIN"
copy_file "$MINEPLEX_PLUGIN_PATH/Anticheat.jar" "/app/servers_data/servers/$MINEPLEX_SERVER_NAME/plugins/Anticheat.jar"


echo "Copying and creating configuration files"
# Copy config files
cp "$MINEPLEX_CONFIG_PATH/redis-config.dat" "/app/servers_data/servers/$MINEPLEX_SERVER_NAME/redis-config.dat"
cp "$MINEPLEX_CONFIG_PATH/database-config.dat" "/app/servers_data/servers/$MINEPLEX_SERVER_NAME/database-config.dat"
cp "$MINEPLEX_CONFIG_PATH/api-config.dat" "/app/servers_data/servers/$MINEPLEX_SERVER_NAME/api-config.dat"

mkdir "/app/servers_data/servers/$MINEPLEX_SERVER_NAME/$MINEPLEX_PLUGIN_CONFIG_PATH/"
echo "webServer: http://$MINEPLEX_WEB_SERVER_HOST/" > "/app/servers_data/servers/$MINEPLEX_SERVER_NAME/$MINEPLEX_PLUGIN_CONFIG_PATH/config.yml"
echo "serverstatus:" >> "/app/servers_data/servers/$MINEPLEX_SERVER_NAME/$MINEPLEX_PLUGIN_CONFIG_PATH/config.yml"
echo "  group: $MINEPLEX_PREFIX" >> "/app/servers_data/servers/$MINEPLEX_SERVER_NAME/$MINEPLEX_PLUGIN_CONFIG_PATH/config.yml"
echo "  name: $MINEPLEX_SERVER_NAME" >> "/app/servers_data/servers/$MINEPLEX_SERVER_NAME/$MINEPLEX_PLUGIN_CONFIG_PATH/config.yml"
echo "  connectionurl: $MINEPLEX_DATABASE_ADDR" >> "/app/servers_data/servers/$MINEPLEX_SERVER_NAME/$MINEPLEX_PLUGIN_CONFIG_PATH/config.yml"
echo "  username: $MINEPLEX_DATABASE_USER" >> "/app/servers_data/servers/$MINEPLEX_SERVER_NAME/$MINEPLEX_PLUGIN_CONFIG_PATH/config.yml"
echo "  password: $MINEPLEX_DATABASE_PASS" >> "/app/servers_data/servers/$MINEPLEX_SERVER_NAME/$MINEPLEX_PLUGIN_CONFIG_PATH/config.yml"

# Set up eula.txt
echo "eula=true" > eula.txt

# Set up server.properties
echo "allow-nether=false" > server.properties
echo "spawn-monsters=false" >> server.properties
echo "announce-player-achievements=false" >> server.properties
echo "snooper-enabled=false" >> server.properties
echo "server-port=$MINEPLEX_PORT" >> server.properties
echo "view-distance=8" >> server.properties
echo "spawn-animals=false" >> server.properties
echo "generate-structures=false" >> server.properties
echo "online-mode=false" >> server.properties

# Set up bukkit.yml
echo "settings:" > bukkit.yml
echo "  allow-end: false" >> bukkit.yml

# Set up spigot.yml
echo "settings:" > spigot.yml
echo "  save-user-cache-on-stop-only: true" >> spigot.yml
echo "  disable-world-saving: true" >> spigot.yml
echo "  bungeecord: true" >> spigot.yml
echo "  restart-on-crash: false" >> spigot.yml
echo "world-settings:" >> spigot.yml
echo "  default:" >> spigot.yml
echo "    anti-xray:" >> spigot.yml
echo "      enabled: false" >> spigot.yml

# Disable metrics
mkdir plugins/PluginMetrics
echo "opt-out: true" > plugins/PluginMetrics/config.yml

# Setup World
echo "Moving lobby world file"
copy_file "$MINEPLEX_LOBBY_PATH/$MINEPLEX_WORLD_ZIP" "/app/servers_data/servers/$MINEPLEX_SERVER_NAME/world.zip"
cd "/app/servers_data/servers/$MINEPLEX_SERVER_NAME"

echo "Extracting world"
unzip "world.zip"
echo "Starting world"
java -jar spigot.jar
