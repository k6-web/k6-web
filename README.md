# k6-web

## Overview

k6-web is a web extension for [k6](https://k6.io/), a popular open-source load testing tool. This extension allows users
to run k6 load tests directly from their web browsers, making it easier to test web applications without needing to set
up a separate environment.

## Features

- **Browser Integration**: Run k6 scripts directly from your web browser.
- **User-Friendly Interface**: Simple and intuitive UI for managing and executing load tests.
- **Real-Time Results**: View test results in real-time within the browser.
- **Script Management**: Easily create, edit, and manage k6 scripts.
- **Customizable Load Profiles**: Define different load profiles to simulate various user behaviors.
- **Export Results**: Export test results in various formats for further analysis.
- **Open Source**: Fully open-source and community-driven.

## Installation

### (1) Docker

#### Quick Start with Docker Compose (Recommended)

```shell
# Clone repository
git clone https://github.com/k6-web/k6-web
cd k6-web

# Start all services
docker-compose up -d

# Access the application at http://localhost:5173
```

#### Using Pre-built Images

##### 1. K6 Agent (k6-web-agent)

```shell
docker pull ghcr.io/k6-web/k6-web-agent:latest
docker run -p 3000:3000 ghcr.io/k6-web/k6-web-agent:latest
```

##### 2. K6 Web (k6-web-front)

```shell
docker pull ghcr.io/k6-web/k6-web:latest
docker run -p 5173:5173 -e VITE_API_URL=http://localhost:3000 ghcr.io/k6-web/k6-web:latest
```

### (2) Manual Installation (Source Build)

#### 1. K6 Web (k6-web)

Node.js is required.

```shell
git clone https://github.com/k6-web/k6-web
cd k6-web/k6-front

# Change Environment Variables if needed (.env)

npm install
npm start # or npm run build && npx serve -s build
```

#### 2. K6 Agent (k6-agent)

Node.js and k6 are required.

```shell
git clone https://github.com/k6-web/k6-web
cd k6-web/k6-agent

# Change Environment Variables if needed (.env)

npm install
npm start # or npm run build && node dist/index.js
```

## Preview

### Home

<img src="docs/home.png">

### New Test

<img src="docs/new_test.png">

### Running Test (Live)

<img src="docs/test_running.png">

### Test Result

<img src="docs/test.png">

