import os
import random

import pandas as pd
import numpy as np

from config_parameters.file_config import _validate_options

def _read_csv_to_pandas(filepath, options=None, skip_rows=None):
    """ loads an ascii file with the options set by the user.
        
    Args:
        path: file path to the data file.
        options: options for reading files (encoding, header row etc).

    Returns:
        A pandas dataframe containing the data loaded from the file.
    """
    if options is None:
        # load with pandas defaults if options are None
        return pd.read_csv(filepath, dtype='object')   

    if skip_rows is None and options['startLine'] > 0:    
        skip_rows = range(options['headerRow']+1,  options['headerRow']+options['startLine']+1)    
    
    # Generate a list of strings to be identified as NaN values
    na_options = None
    if len(options['naOptions']):
        na_options = []
        for opt in options['naOptions']:
            na_options.append(opt['value'])
    
    return pd.read_csv(
            filepath,
            dtype='object',
            encoding=options['encoding'], 
            delimiter=options['delim'],
            header=options['headerRow'],
            skiprows=skip_rows,
            lineterminator=options['lineDelim'],
            escapechar=options['escapechar'],
            comment=options['comment'],
            decimal=options['decimal'],
            thousands=options['thousands'],
            skip_blank_lines=options['skipEmpty'],
            na_values=na_options
        )    

class DataReader:
    """ Class which handles quickly loading sampled data 
    without scanning the full file. """

    def __init__(self, filepath, options=None):
        """ Constructor for DataReader class. 

        Args: 
            filepath: Filepath to the data.
        """
        if not isinstance(filepath, str):
            raise TypeError("Expected filepath to be a string.")

        self.filepath = filepath
        self.options = options
        self.options = _validate_options(options)
        self.header = self.options["headerRow"]
        self.delim = self.options["delim"]
            
        self.column_line = None
        
        
    def columns(self, fp=None):
        """ Returns the columns for the dataset. """
        is_open = fp is not None
        if not is_open:
            fp = open(self.filepath)

        # read column header 
        for _ in range(self.header):  
            fp.readline()  # move fp to header row

        # keep track of the column row so we don't accidently
        # include it later
        self.column_line = fp.readline()        
        columns = self.column_line.rstrip('\n').split(self.delim)
        
        if not is_open:  # did we open it
            fp.close()  # then we close it

        return columns
    
    def line_count(self):
        """ Returns the number of lines in the file. """
        fp = open(self.filepath)
        lc = sum(1 for _ in fp)
        fp.close()
        return lc - 1  # don't include header row
        
    def sample(self, nsamples=1000):
        """ Reads a random sample of lines from a file. 

        Args:
            nsamples: Number of samples to read.
        
        Returns:
            A sample Pandas Dataframe.
        """
        filesize = os.path.getsize(self.filepath)    
        fp = open(self.filepath)

        # check if there are more samples than rows
        if all(i <= nsamples for i, _ in enumerate(fp)):
            fp.close()                        
            return _read_csv_to_pandas(self.filepath, self.options)

        fp.seek(0)  # reset to beginning
        columns = self.columns(fp)
        ldata = [self.readline_random(fp, filesize) for _ in range(nsamples)]
        
        fp.close()

        # Create dataframe and replace empty values with nan
        return pd.DataFrame([sub.split(self.delim) for sub in ldata],
                            columns=columns).replace(r'^\s*$', np.nan, regex=True)

    
    def readline_random(self, f, filesize):
        """ Returns a random line somewhere in the file. """
        offset = random.randrange(filesize)
        f.seek(offset, 0)               # go to random position
        f.readline()                    # discard - bound to be partial line
        random_line = f.readline()      # bingo!
        
        # extra to handle last/first line edge cases
        if len(random_line) == 0:       # we have hit the end
            f.seek(0)
            random_line = f.readline()  # so we'll grab the first line instead

        if random_line == self.column_line:
            return self.readline_random(f, filesize)
        
        return random_line.rstrip('\n')

class DataReaderPandas:
    """ Class which handles quickly loading sampled data 
    by skipping rows with pandas read csv. """

    def __init__(self, filepath, options=None):
        """ Constructor for DataReader class. 

        Args: 
            filepath: Filepath to the data.
        """
        if not isinstance(filepath, str):
            raise TypeError("Expected filepath to be a string.")

        self.filepath = filepath        
        # validate options, if None a set of defaults will be generated
        self.options = _validate_options(options)   
        self.header = self.options["headerRow"]
        self.cols = None
        
    def columns(self):
        """ Returns the columns for the dataset. """
        if self.cols is None:            
            self.sample()

        return self.cols
    
    def line_count(self):
        """ Returns the number of lines in the file. """
        fp = open(self.filepath)
        lc = sum(1 for _ in fp)
        fp.close()        

        return lc - 1  # don't include header row
        
    def sample(self, nsamples=1000):
        """ Reads a random sample of lines from a file. 

        Args:
            nsamples: Number of samples to read.
        
        Returns:
            A sample Pandas Dataframe.
        """       
        
        last_line = self.line_count()
        num_lines = last_line - self.header
        skip_rows = None
        if num_lines > nsamples: 
            # Randomly select rows to be skipped when reading the dataset 
            skip_rows = random.sample(range(self.header+1, last_line), num_lines-nsamples)                             
        
        df = _read_csv_to_pandas(self.filepath, self.options, skip_rows)                        
        self.cols = list(df.columns)                  
        
        return df
