from threading import Lock 
import pickle

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
        self._storepath = None
        
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

    def set_path(self, path):
        """ Sets the filepath to store data to. """
        self._storepath = path

    def _get_data_from_disk(self, path):
        """ Returns data loaded from disk """
        with open(path, 'rb') as handle:
            cached = pickle.load(handle)
            
        return cached
    
    def get_data(self, uid):
        """ Returns data associated with uid.
        
        Args:
            uid: Unique identifier to get data from.        
        """
        if self._data[uid]['on_disk']:
            return self._get_data_from_disk(self._data[uid]['payload'])

        return self._data[uid]['payload']

    def store_contains(self, uid):
        """ Returns true if data is associated with uid. """
        try:
            self.get_data(uid)
            return True
        except:
            return False
        
    def store_data(self, uid, data, to_disk=False):
        """ Store data associated with uid. 

        Args:
            uid: Unique identifier to store data under.
            data: Data to store.
        """
        if uid in self._data:
            self.delete_data(uid)

        if to_disk:
            path = f'{self._storepath}/{uid}.pkl'
            #self._data[uid] = data
        
            with open(path, 'wb') as handle:
                pickle.dump(data, handle, protocol=pickle.HIGHEST_PROTOCOL)
                
            self._data[uid] = {'payload': path, 'on_disk': True}
        else:
            # store data locally
            self._data[uid] = {'payload': data, 'on_disk': False}
        

    def delete_data(self, uid):
        """ Deletes the data associated with uid. 

        Args:
            uid: Unique identifier to store data under.
        """
        try:
            del self._data[uid]
        except KeyError as e:
            # uid doesn't exist, no need to free
            pass 
        
    def reset_store(self):
        """ Function to reset the DataStore to its initial state. """
        DataStore._ID = 0
        self._data = {}  
