# Production Readme
All commands below are assumed to be executed in the current directory, which is the `production` directory.
## Prerequisites
- Docker
- Docker Compose
- Prebuilt JavaScript application files (located in the `dist` directory under the current directory)
- A REST API backend server (e.g., `http://localhost:18000`) and a WebSocket backend server (e.g., `ws://localhost:19000/ws`) running and accessible from the container (as per needed).
- A map service API key (e.g., `get_your_own_OpIi9ZULNHzrESv6T2vL`) for the map service. You can get your own API key from the map service provider such as [MapTiler](https://maptiler.com/). ***Only MapTiler is Supported. If you need more supported providers, contact the developer team.***
## Configuration Files
The configuration files are located in the current directory. The following files are available:
- `Dockerfile`: The Dockerfile used to build the application image.
- `default.conf`: The default configuration file for the application's nginx server.
- `compose.yaml`: The main Docker Compose file that defines the services, networks, and volumes for the application.
- `config_template.json`: The template for the secret configuration file for the application. 
    - **Please make a copy of this file and rename it to `config.json` before deploying the application.**

It is recommended ***NOT*** to change the `Dockerfile` and `default.conf` files unless you know what you are doing. The `compose.yaml` file and `config.json` files are the main files you will be working with.
### compose.yaml
| Variable | Description | Default Value |
|----------|-------------|---------------|
| `ports` | The ports to expose for the application. | `14280:80` |
### config.json
| Variable | Description | Default Value |
|----------|-------------|---------------|
| `production` | The production flag. DO NOT CHANGE for deployment. | `true` |
| `apiUrl` | The URL of the REST API backend server. | `http://localhost:18000` |
| `wsUrl` | The URL of the WebSocket backend server. | `ws://localhost:19000/ws` |
| `mapKey` | The API key for the map service. | `get_your_own_OpIi9ZULNHzrESv6T2vL` |
## Deployment
### Build Container
In the current directory (all commands below are assumed to be executed in the current direct), run the following command to build the Docker container:
```bash
docker compose build
```
### Run Container
To run the container, use the following command:
```bash
docker compose up -d
```
### Stop Container
To stop the container, use the following command:
```bash
docker compose down
```
### Accessing the Application
Once the container is running, you can access the application by navigating to `http://<your-server-ip>:<your-port>` in your web browser. `your-port` refers to the port you have specified in `compose.yaml`, or `14200` by default. Feel free to set up a reverse proxy to access the application via a domain name.