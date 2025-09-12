<p align="center">
  <img src="https://github.com/KenWeTech/Restoqit/blob/main/logo.png?raw=true" alt="Restoqit Logo" width="200"/>
</p>

# Restoqit

**A self-hosted app that show you a simple overview of things you might need to restock for your** [**Grocy**](https://grocy.info/ "null") **instance.**

Restoqit provides a clean, responsive PWA dashboard that connects to your Grocy server. It's designed to give you a quick, mobile-friendly overview of your inventory's status, focusing on what needs your attention now.

## Features

-   **At-a-Glance Overview:** Main dashboard shows a summary of items that are expired, expiring soon, low in stock, and on your grocery list.

-   **Detailed Views:** Separate pages for Expired, Expiring Soon, Low Stock, and Grocery Lists.
        
-   **PWA Ready:** Installable on mobile and desktop for a native-app experience with offline viewing of the last data you loaded.
    
-   **Interactive Grocery List:** Tap items to visually mark them off as you shop.
    
-   **Secure & Self-Hosted:** Your data stays on your network.
    
-   **Customizable:** Features settings for your Grocy connection, weather display, date/time formats, and a dark mode.
    

## Getting Started (Docker Recommended)

This is the simplest method to get Restoqit running in minutes.

1.  **Create a `docker-compose.yml` file:** Create a new file named `docker-compose.yml` and paste the following content into it:
    
    ```

    services:
      restoqit:
        image: ghcr.io/KenWeTech/restoqit:latest
        container_name: restoqit
        restart: unless-stopped
        # To enable mDNS discovery, uncomment the 'network_mode: "host"' line below.
        # When using host mode, you must also comment out the 'ports' section below.
        # network_mode: "host"
        ports:
          - "8686:8686"
        volumes:
          - ./restoqit_data:/app/data
    
    volumes:
      restoqit_data:
    
    ```
    
    _Note: A `restoqit_data` folder will be created in the same directory to store the database, ensuring your settings and users persist._
    
2.  **Start the container:** Open a terminal in the same directory as your `docker-compose.yml` file and run:
    
    ```
    docker-compose up -d
    
    ```
    
3.  **Access Restoqit:** Open your browser and navigate to `http://localhost:8686`. If your network supports mDNS, you may also be able to use `http://restoqit.local:8686`.
    

## First-Time Setup

Upon first launch, you will be prompted to log in.

-   **Default Username:**  `admin`
    
-   **Default Password:**  `password`
    

**IMPORTANT:** Immediately after logging in, go to the **Settings** page to configure the application. It is highly recommended that you change the default admin password.

You must configure:

1.  **Grocy URL:** The full URL to your Grocy instance (e.g., `http://192.168.1.50:9283`).
    
2.  **Grocy API Key:** Your API key generated within Grocy.
    

## Manual Installation (Alternative)

If you prefer to run the application directly without Docker:

1.  **Prerequisites:**
    
    -   [Node.js](https://nodejs.org/ "null") (v16 or later)
        
    -   npm
        
2.  **Clone the repository and navigate to the app folder:**
    
    ```
    git clone [https://github.com/KenWeTech/Restoqit.git](https://github.com/KenWeTech/Restoqit.git)
    cd Restoqit/restoqit
    
    ```
    
3.  **Install dependencies and run:**
    
    ```
    npm install
    npm start
    
    ```
    
    The application will be available at `http://localhost:8686` or `http://restoqit.local:8686`.
    

