from threading import Lock 

class DataStore:
    """ NOTE: We use a singleton instance here because we are 
    assuming that this application will either be run as a desktop
    app (i.e. in which flask is used to facilitate calls to python 
    functions) or that it will be run in a virtualized setting (e.g. 
    in a virtual machine on AWS). 
    """
    _instance = None
    _lock = Lock()
    _ID = 0

    def __init__(self):
        """ Constructor for DataStore. """
        self._data = {}  
        
    @classmethod
    def instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = DataStore()

            return cls._instance

    def get_uid(self):
        """ Gets a unique id. """
        with DataStore._lock:
            DataStore._ID += 1
            return DataStore._ID - 1        

    def get_data(self, uid):
        """ Returns data associated with uid.
        
        Args:
            uid: Unique identifier to get data from.        
        """
        return self._data[uid]

    def store_contains(self, uid):
        """ Returns true if data is associated with uid. """
        try:
            self.get_data(uid)
            return True
        except:
            return False
        
    def store_data(self, uid, data):
        """ Store data associated with uid. 

        Args:
            uid: Unique identifier to store data under.
            data: Data to store.
        """
        self._data[uid] = data
