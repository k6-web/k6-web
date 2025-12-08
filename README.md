# k6-web

## Overview

k6-web is a web extension for [k6](https://k6.io/), a popular open-source load testing tool. This extension allows users
to run k6 load tests directly from their web browsers.

## Features

- **Browser Integration**: Run k6 scripts directly from your web browser.
- **User-Friendly Interface**: Simple and intuitive UI for managing and executing load tests.
- **Real-Time Results**: View test results in real-time within the browser.
- **Script Management**: Easily create, edit, and manage k6 scripts.

## Preview

### 1. Home

<img src="docs/home.png">

### 2. New Test

<img src="docs/new_test.png">

### 3 Running Test (Live)

<img src="docs/test_running.png">

### 4. Test Result

<img src="docs/test.png">

## Installation

### Option 1: Docker (Recommended)

#### 1. K6 Agent (k6-web-agent)

```shell
docker pull ghcr.io/k6-web/k6-web-agent:latest
docker run -p 3000:3000 ghcr.io/k6-web/k6-web-agent:latest
```

#### 2. K6 Web (k6-web-front)

```shell
docker pull ghcr.io/k6-web/k6-web:latest
docker run -p 5173:5173 -e VITE_API_URL=http://localhost:3000 ghcr.io/k6-web/k6-web:latest
```

### Option 2: Build from Source

#### 1. K6 Web

Node.js (>= 20) is required.

```shell
git clone https://github.com/k6-web/k6-web
cd k6-web/k6-front

# Change Environment Variables if needed (.env)

npm install
npm start # or npm run build && npx serve -s build
```

#### 2. K6 Agent

Node.js (>= 20) and k6 are required.

```shell
git clone https://github.com/k6-web/k6-web
cd k6-web/k6-agent

# Change Environment Variables if needed (.env)

npm install
npm start # or npm run build && node dist/index.js
```
