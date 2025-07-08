# -----------------------------------------------------------
# Initializes over socketIO communtication with the server
# and handles custom message generation
# -----------------------------------------------------------

from threading import Lock 
from flask_socketio import SocketIO, emit


class SocketComm:
    """ NOTE: We use a singleton instance to ensure that
    a single socketIO line is open. 
    """
    _instance = None
    _lock = Lock()

    def __init__(self):
        """ Constructor for SocketComm. """
        self.socketio = SocketIO()
        
    @classmethod
    def instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = SocketComm()

            return cls._instance

    def init_app(self, app):
        """ Initializae SocketIO with the flask app.

        Args:
            app: flask app object
        
        """
        
        self.socketio.init_app(app, cors_allowed_origins="*")
    
    def run(self, app, port):
        """ Runs the flask app with SocketIO.

        Args:
            app: flask app object
            port: the port on which the flask app will run
        
        """
        
        self.socketio.run(app, host='127.0.0.1', port=port)


    def send_message(self, end_point, data):
        """ Sends data over the websocket connection to an end point.

        Args:
            ID: action node ID in the flowgraph.
            type: action type.
            is_loading: indicates if node is loading (true if loading).

        Emits: 
            The result of the action.
        """
        self.socketio.emit(end_point,  data)

    def send_action_status(self, ID, type, is_loading):
        """ Constructs a response to set the loading status of an action
        and sends it over the websocket connection.

        Args:
            ID: action node ID in the flowgraph.
            type: action type.
            is_loading: indicates if node is loading (true if loading).

        Emits: 
            The result of the action.
        """    
        resp = {
            'ID': ID,
            'loading': is_loading,
            'message': type + (" starting" if is_loading else " finished")
        }
        self.socketio.emit('set-action-loading',  resp) 

    def send_action_results(self, ID, type, result):
        """ Constructs a response to set the result/output of an action
        and sends it over the websocket connection.

        Args:
            ID: action node ID in the flowgraph.
            type: action type.
            result: Dict of the action result.

        Emits: 
            The result of the action.
        """    
        resp = {
            'ID': ID,
            'type': type,
            'result': result,
            'message': "Result for " + type
        }        
        self.socketio.emit('set-action-output',  resp) 