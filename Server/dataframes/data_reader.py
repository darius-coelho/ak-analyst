import os
import random
from copy import deepcopy
from io import StringIO
from minio import Minio
from minio.select import (CSVInputSerialization, CSVOutputSerialization, SelectRequest)

import pandas as pd
import numpy as np

from config_parameters.file_config import _validate_options

def _read_csv_to_pandas(filepath, options=None, skip_rows=None, nrows=None):
    """ loads an ascii file with the options set by the user.
        
    Args:
        path: file path to the data file.
        options: options for reading files (encoding, header row etc).

    Returns:
        A pandas dataframe containing the data loaded from the file.
    """
    if options is None:
        # load with pandas defaults if options are None
        return pd.read_csv(filepath, dtype='object', error_bad_lines=False, warn_bad_lines=False)

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
        nrows=nrows,
        lineterminator=options['lineDelim'],
        escapechar=options['escapechar'],
        comment=options['comment'],
        decimal=options['decimal'],
        thousands=options['thousands'],
        skip_blank_lines=options['skipEmpty'],
        na_values=na_options,
        error_bad_lines=False,
        warn_bad_lines=False
    )

def read_raw(filepath, encoding, line_delim='\n', nlines=10):
    """ Creates a list of string for each line of the file. 
    
    Args:
        filepath: Location of the file to read.
        encoding: Text encoding.
        line_delim: Line delimeter.
        nlines: Number of lines to read.

    Returns:
        List of length nlines containing rows of the file.
    """

    # check for valid line delimiters
    if line_delim not in ['\n', '\r', '\r\n']:
        line_delim = None  # auto detect
        
    with open(filepath, encoding=encoding, newline=line_delim) as fp:
        head = []
        for line in fp:
            head.append(line)
            if len(head) >= nlines:
                break

    return head

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
        self.filesize = os.path.getsize(filepath)
        
        self.options = _validate_options(options)
        self.header_row = self.options["headerRow"]
        self.delim = self.options["delim"]
        self.line_delim = '\n' if self.options['lineDelim'] is None \
                          else self.options['lineDelim']
        self.skip_bytes = 0
        self.column_line = None
            
        self._header()

        
    def _header(self, batch_size=10_000_000):
        """ Gets header info. """

        lines = []
        nskip_lines = self.options['headerRow'] + self.options['startLine']

        # get the number of bytes to skip
        with open(self.filepath, encoding=self.options["encoding"]) as fp:
            while True:
                raw = fp.read(batch_size)
                lines = lines + raw.split(self.line_delim)

                if len(lines) >= nskip_lines:
                    self._columns = lines[self.header_row].split(self.delim)
                    self.skip_bytes = sum(len(l.encode('utf-8'))+1 \
                                          for l in lines[:nskip_lines+1])
                    break

                if raw == '':
                    break
        
                
    def columns(self, fp=None):
        """ Returns the columns for the dataset. """
        return self._columns

    
    def line_count(self, batch_size=10_000_000, nbatches=None):
        """ Returns the number of lines in the file. """
        lc = 0
        with open(self.filepath, encoding=self.options["encoding"]) as fp:
            nbatch = 0
            while nbatches is None or nbatch < nbatches:
                nbatch += 1
                raw = fp.read(batch_size)
                if raw == '':  # end of file
                    break

                lc += sum(c==self.line_delim for c in raw)

        # exclude header row and skipped lines
        return lc - self.options['headerRow'] - 1 - self.options['startLine']

    def approx_line_count(self, batch_size=10_000_000, nbatches=1):
        """ Returns an approximate line count. """

        sample_count = self.line_count(batch_size, nbatches)
        scale_factor = self.filesize / (nbatches*batch_size)
        if scale_factor <= 1:
            return sample_count  # counted all the lines

        return int(scale_factor * sample_count)
        
    def is_line_count_leq_than(self, N, batch_size=100_000):
        """ Returns True if line count is <= N. False o.w. """
        lc = 0
        fp = open(self.filepath, encoding=self.options["encoding"])
        while True:
            raw = fp.read(batch_size)
            if raw == '':  # end of file
                break

            for c in raw:
                lc += c==self.line_delim
                if lc - self.options['headerRow'] - 1 - self.options['startLine'] > N:
                    fp.close()
                    return False

        fp.close()
        return True

    def head(self, nrows=100):
        """ Reads the first nrows of the file. 

        Args:
            nrows: Number of rows to read.
        
        Returns:
            A Pandas Dataframe.
        """
        return _read_csv_to_pandas(self.filepath, self.options, nrows=nrows)
        
        
    def sample(self, nsamples=1000):
        """ Reads a random sample of lines from a file. 

        Args:
            nsamples: Number of samples to read.
        
        Returns:
            A sample Pandas Dataframe.
        """
        if self.is_line_count_leq_than(nsamples):
            return _read_csv_to_pandas(self.filepath, self.options)

        data = []
        with open(self.filepath, encoding=self.options["encoding"]) as fp:
            while True:
                data = data + self.readlines_random(fp)
                if len(data) >= nsamples:
                    break

        # create dataframe from sampled lines
        data = [self.options['delim'].join(self.columns())] + data[:nsamples]
        data = [d + self.line_delim for d in data]
        sample_options = {**self.options}
        sample_options['headerRow'] = 0
        sample_options['startLine'] = 0        
        result=  _read_csv_to_pandas(StringIO(''.join(data)), sample_options)
        return result

    
    def readlines_random(self, fp, rate=0.1, batch_size=10_000_000):
        """ Reads a batch of data into memory and randomly selects lines. 

        Args:
            fp: File pointer.
            rate: Sampleing rate.
            batch_size: Size of data to read into memory at any one time.
        
        Returns:
            A list of random lines somewhere in the file. 
        """        
        offset = random.randrange(self.skip_bytes, self.filesize)
        fp.seek(offset, 0)

        raw = fp.read(batch_size)

        # ignore the first and last lines as they're likely partial
        lines = raw.split(self.line_delim)[1:-1]
        
        if len(lines) == 0:
            # try again and increase the batch_size
            return self.readlines_random(fp, rate, 10 * batch_size)
        
        return random.choices(lines, k=max(int(len(lines)*rate), 1))                
    
    
class DataReaderCloud:
    """ Class which handles quickly loading sampled data without pulling the 
    full data from the cloud. """
    
    def __init__(self, ipaddr, bucket, datalake_file, uname, secret_key, options):        
        """ Constructor for the DataReaderCloud class.

        Args:
            ipaddr: IP Address for the data lake..
            bucket: S3 bucket.
            datalake_file: Filepath in the datalake.
            uname: Username
            secret_key: Secret key.
            options: Dict of options for parsing the data.            
        """
        self.client = Minio(
            ipaddr, 
            access_key=uname,
            secret_key=secret_key,
            secure=True
        )
        self.ipaddr = ipaddr
        self.bucket = bucket
        self.filepath = datalake_file
        self.options = _validate_options(options)
        self.filesize = self.client.stat_object(bucket, datalake_file).size

        self._header()
        
    def __deepcopy__(self, memo):
        """ Overwrite the deepcopy method to prevent issues with Minio. """
        cls = self.__class__
        result = cls.__new__(cls)
        memo[id(self)] = result
        result.__dict__.update(self.__dict__)
        result.options = deepcopy(self.options)
        return result
        
    def _header(self):
        """ Get the header info. """
        # NOTE: account for skip rows after header
        with self.client.select_object_content(
            self.bucket,
            self.filepath,
            SelectRequest(
                f'SELECT * FROM S3Object limit {self.options["headerRow"]+1}',
                CSVInputSerialization(field_delimiter=self.options['delim'],
                                      record_delimiter=self.options['lineDelim'],
                                      file_header_info='NONE'),
                CSVOutputSerialization(record_delimiter='\n'),
                request_progress=False,
            ),        
        ) as result:            
            self.skip_bytes = int(result._read())
            for data in result.stream(self.skip_bytes):
                raw = data.decode().split('\n')
                self._columns = raw[self.options['headerRow']].split(',')

    def head(self, nrows=100):
        """ Reads the first nrows of the file. 

        Args:
            nrows: Number of rows to read.
        
        Returns:
            A Pandas Dataframe.
        """
        with self.client.select_object_content(
            self.bucket,
            self.filepath,
            SelectRequest(
                f'SELECT * FROM S3Object LIMIT {nrows}',
                CSVInputSerialization(field_delimiter=self.options['delim'],
                                      record_delimiter=self.options['lineDelim'],
                                      file_header_info='NONE'),
                CSVOutputSerialization(record_delimiter='\n'),
                request_progress=False,
            ),        
        ) as result:
            skip_bytes = int(result._read())
            return _read_csv_to_pandas(StringIO(next(result.stream(skip_bytes)).decode()))

        raise AssertionError("Failed to connect to data lake.")
        
    def columns(self):
        """ Returns the columns. """
        return self._columns

    
    def line_count(self):
        """ Gets the number of records. """
        with self.client.select_object_content(
            self.bucket,
            self.filepath,
            SelectRequest(
                f'SELECT count(*) FROM S3Object',
                CSVInputSerialization(field_delimiter=self.options['delim'],
                                      record_delimiter=self.options['lineDelim'],
                                      file_header_info='NONE'),
                CSVOutputSerialization(record_delimiter='\n'),
                request_progress=False,
            ),        
        ) as result:
            lc = int(next(result.stream()).decode()) - self.options['headerRow'] - 1
            return lc

    def is_line_count_leq_than(self, N):
        """ Returns True if line count is <= N. False o.w. """
        with self.client.select_object_content(
            self.bucket,
            self.filepath,
            SelectRequest(
                f'SELECT * FROM S3Object LIMIT {N+1}',
                CSVInputSerialization(field_delimiter=self.options['delim'],
                                      record_delimiter=self.options['lineDelim'],
                                      file_header_info='NONE'),
                CSVOutputSerialization(record_delimiter='\n'),
                request_progress=False,
            ),        
        ) as result:
            lc =0
            nbytes = int(result._read())
            for data in result.stream(nbytes):
                lc += sum(c=='\n' for c in data.decode())

        return lc <= N

        
    def sample(self, nsamples=1000):
        """ Reads a random sample of lines from the file. 

        Args:
            nsamples: Number of samples to read.
        
        Returns:
            A sample pandas Dataframe.
        """
        if self.is_line_count_leq_than(nsamples):
            data = None
            try:
                response = self.client.get_object(self.bucket, self.filepath)
                sample_options = {**self.options}
                data = _read_csv_to_pandas(response, sample_options)
            finally:
                response.close()
                response.release_conn()
                
            return data
                

        data = []
        for i in range(nsamples):
            data = data + self.readlines_random()
            if len(data) >= nsamples:
                break

        # create dataframe from sampled lines
        data = [self.options['delim'].join(self.columns())] + data[:nsamples]

        # NOTE: The output record_delimiter is \n
        data = [d + '\n' for d in data]
        sample_options = {**self.options}
        sample_options['headerRow'] = 0
        
        return _read_csv_to_pandas(StringIO(''.join(data)), 
                                   sample_options)
    
        
    def readlines_random(self, length=100_000):
        try:
            offset = random.randrange(self.skip_bytes, self.filesize)
            
            response = self.client.get_object(self.bucket,
                                              self.filepath,
                                              offset=offset,
                                              length=length)
            data = response.read()
            
            line_delim = '\n' if self.options['lineDelim'] is None else self.options['lineDelim']
            lines = data.decode().split(line_delim)[1:-1]
            sample = [line.strip() for line in random.choices(lines, k=len(lines)//2)]
        finally:
            response.close()
            response.release_conn()
            
        return sample

