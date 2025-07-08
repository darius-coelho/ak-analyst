import pandas as pd

from dataframes.data import Data

from ak_logger import logger, log_it
from config_parameters.file_config import _validate_options

class FileResult:
    """ Representation of the result of executing an 
    action which produces a file / dataframe. """

    @log_it
    def __init__(self, name, path, options=None, data=None, last_modified=None):
        """ Constructor for FileResult class:
        
        Args: 
            name: Name of the file in workspace.
            path: File path in workspace.
            data: Dataframe containing the data.
            last_modified: timestamp for last modification.
        """
        self.name = name
        self.path = path   
        # if path is set, test that it is valid
        if self.path:            
            fp = open(self.path)
            fp.close() 
        # validate options, if None a set of defaults will be generated
        self.options = _validate_options(options)        
        self._data = data
        self.last_modified = last_modified

    @log_it   
    def data(self):
        """ Returns the full dataframe. """
        if self._data is None:
            self._data = Data(self.path, options=self.options)

        return self._data
    
    @log_it   
    def preview(self, nrows=100):
        """ Returns a short preview of the data. """
        if self._data is None:
            self._data = Data(self.path, options=self.options)            

        return self._data.sample(nrows).get_sampled_data(nrows)

    @log_it
    def rawPreview(self, nlines=10):
        if self.path is None:
            return None
        
        fp = open(self.path)
        lc = sum(1 for _ in fp)
        fp.close() 
        if lc < nlines:
            nlines = lc

        with open(self.path) as myfile:
            head = [next(myfile) for x in range(nlines)]            
            return head
        return None
        
    @log_it   
    def response(self):
        """ Creates a response to pass to the front end. """
        preview = self.preview()
        preview = preview.where(pd.notnull(preview), None)
        rawPreview = self.rawPreview(10)

        return {
                'name': self.name,
                'path': self.path,
                'options': self.options,
                'lastModified': self.last_modified,
                'columns': preview.columns.tolist(),
                'rawPreview': rawPreview,
                'preview': preview.fillna("NaN").to_dict(orient='records'),
               }

class FPResult:
    """ Representation of patterns mined from the FPMiner. """
    @log_it 
    def __init__(self, model, train_df, config):
        """ Wrapper for a pre-trained barl model. 

        Args: 
            model: Pre-trained model containing list of patterns.
        """
        self.model = model
        self.train_df = train_df
        self.config = config        

    @log_it 
    def response(self):
        """ Creates a response to pass to the front end. """
        summary = (self.model.get_summary())
        return summary


class ErrorResult(Exception):
    """ Representation of patterns mined from the FPMiner. """
    @log_it 
    def __init__(self, nodeID, action_type, err):
        """ Wrapper for a pre-trained barl model. 

        Args: 
            model: Pre-trained model containing list of patterns.
        """
        self.nodeID = nodeID
        self.action_type = action_type
        self.err = str(type(err).__name__) + ": " + str(err)     
        super().__init__(self.err)   

    @log_it 
    def response(self):
        """ Creates a response to pass to the front end. """
        return {
                'nodeID': self.nodeID,
                'action_type': self.action_type,
                'err': self.err,
               }

        
