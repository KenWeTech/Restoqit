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
    
### Screenshots

Main screen

<p align="center">
  <img src="https://github.com/KenWeTech/Restoqit/blob/main/Restoqit_Dash.png?raw=true" alt="Overview" width="800"/>
</p>

Grocery list section with menu open

<p align="center">
  <img src="https://github.com/KenWeTech/Restoqit/blob/main/Restoqit_GL.png?raw=true" alt="Dashboard" width="800"/>
</p>

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
    
2.  **Create a `.env` file:** Create a new file named `.env` in the same directory as your `docker-compose.yml` file and configure your application's environment variables.
    
    ```
    # The port the application will listen on.
    # Default is 8686 if not specified.
    PORT=8686
    
    # The secret key used to sign the session cookie.
    # IMPORTANT: Change this to a long, random, and unique string for production.
    SESSION_SECRET="a_very_secret_key_for_restoqit"
    
    # Set to 'true' if your application is being served over HTTPS.
    #This ensures cookies are only sent over secure connections.
    # Set to 'false' for local usage without HTTPS.
    SECURE_COOKIE=false
    
    # Set the application's timezone.
    #If not specified, the system's local timezone will be used as the default.
    #Example: "America/New_York"
    #APP_TIMEZONE=
    
    ```
    
    _Note: The Grocy and weather API keys are not set here. They are configured in the application's settings page after the container is running._
      
3.  **Start the container:** Open a terminal in the same directory as your `docker-compose.yml` file and run:
    
    ```
    docker-compose up -d
    
    ```
    
4.  **Access Restoqit:** Open your browser and navigate to `http://localhost:8686`. If your network supports mDNS, you may also be able to use `http://restoqit.local:8686`.
    

## First-Time Setup

Upon first launch, you will be prompted to log in.

-   **Default Username:**  `admin`
    
-   **Default Password:**  `password`
    

**IMPORTANT:** Immediately after logging in, go to the **Settings** page to configure the application. It is highly recommended that you change the default admin password.

You must configure:

1.  **Grocy URL:** The full URL to your Grocy instance (e.g., `http://192.168.1.50:9283`).
    
2.  **Grocy API Key:** Your API key generated within Grocy.

3.  **Default Grocery List:** Select the list that will be displayed on the overview page for quick access. _Note: The options will populate automatically after your Grocy URL and API key are saved and correct._
    
### Optional Settings

After setting up your Grocy connection, you can further customize your dashboard by configuring the following optional features on the settings page:

-   **Weather API Settings:** Enter an OpenWeatherMap API key and your location to display local weather on the dashboard. For the best results, use the format: **City, State, Country** (e.g., New York, NY, USA).
    
-   **Display Settings:** Customize the weather metric, date, and time formats to your preference.
    

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
    

