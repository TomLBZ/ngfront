#!/usr/bin/env python3

import websocket
import threading
import time

def on_message(ws, message):
    print("Received:", message)

def on_error(ws, error):
    print("WebSocket Error:", error)

def on_close(ws, close_status_code, close_msg):
    print("WebSocket closed")

def on_open(ws):
    print("Connected to WebSocket server")

def read_user_input():
    """
    Wait for user to press 'q' to quit.
    Runs in its own thread to avoid blocking the main thread.
    """
    while True:
        user_input = input()
        if user_input.strip().lower() == 'q':
            break

def main():
    # Replace this with your actual WebSocket URL
    websocket_url = "ws://aerows.stdev.remoteblossom.com/ws"

    # Create a WebSocketApp and specify callbacks
    ws_app = websocket.WebSocketApp(
        websocket_url,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close
    )

    # Start the WebSocket in a background thread
    ws_thread = threading.Thread(target=ws_app.run_forever, daemon=True)
    ws_thread.start()

    # Start a thread to read user input for quitting
    input_thread = threading.Thread(target=read_user_input, daemon=False)
    input_thread.start()
    input_thread.join()  # Main thread waits for 'q' to be pressed

    # Once 'q' is pressed, close the WebSocket and exit
    print("Closing WebSocket connection...")
    ws_app.close()
    ws_thread.join()
    print("Exited.")

if __name__ == "__main__":
    main()
