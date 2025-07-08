import imp
import os
from pathlib import Path
import json
import math
import pickle
import pandas as pd
from copy import deepcopy

from minio import Minio
from minio.select import (CSVInputSerialization, CSVOutputSerialization, SelectRequest)
from sklearn.base import is_classifier, is_regressor

from datetime import datetime
from dataframes.data import Data, DataInMem
from analyst.analyst import Analyst

from ak_logger import logger, log_it
from config_parameters.file_config import _validate_options
from file.path_handler import process_filepath, filepath_from_home

class FileResult:
    """ Representation of the result of executing an
    action which produces a file / dataframe. """

    @log_it
    def __init__(self, name, path,
                 options=None, data=None,
                 last_modified=None,
                 delay_load=True,
                 in_mem=False, **kwargs):
        """ Constructor for FileResult class:

        Args:
            name: Name of the file in workspace.
            path: File path in workspace.
            data: Dataframe containing the data.
            last_modified: timestamp for last modification in seconds.
        """
        self.name = name
        self.path = process_filepath(path)
        self.filesize = self.get_filesize()

        self.in_mem = in_mem

        self.est_lines = None
        logger.info("Path = %s", self.path)

        self.kwargs = kwargs  # custom info to include in the response

        # validate options, if None a set of defaults will be generated
        self.options = _validate_options(options)

        self._data = data

        self.last_modified = last_modified
        if isinstance(last_modified, int):
            self.last_modified = datetime.fromtimestamp(last_modified) \
                                         .strftime('%Y-%m-%d %H:%M:%S')

        self.delay_load = delay_load

    @property
    def data(self):
        """ Returns the full dataframe. """
        if self._data is None:
            data_class = DataInMem if self.in_mem else Data
            self._data = data_class(self.path, options=self.options,
                                    delay_load=self.delay_load)

            if data_class is DataInMem or not self.delay_load:
                self.est_lines = self._data.shape[0]
            else:
                self.est_lines = self._data.reader.approx_line_count()


        return self._data

    @log_it
    def get_filesize(self):
        """ Gets the filesize """
        return os.path.getsize(self.path) if self.path is not None else None

    
    @log_it
    def preview(self, nrows=50):
        """ Returns a short preview of the data. """
        return self.data.get_sampled_data(nrows)

    @log_it
    def rawPreview(self, nlines=10):
        """ Creates a list of strings for each line in a text/data file. """
        if self.path is None:
            return None

        fp = open(self.path, encoding=self.options["encoding"])

        is_lc_gt_nlines = False
        lc = 0
        for _ in fp:
            lc += 1
            if lc > nlines:
                is_lc_gt_nlines = True
                break  # no need to get the full line count

        fp.close()

        if not is_lc_gt_nlines:
            nlines = lc

        with open(self.path, encoding=self.options["encoding"]) as myfile:
            head = [next(myfile) for x in range(nlines)]
            return head

        return None

    @log_it
    def download_file(self, port=None):
        """ Returns a csv object of the data for download. """
        df = self.data.to_pandas()
        return df.to_csv(index=False)

    @log_it
    def response(self, nrows=100):
        """ Creates a response to pass to the front end. """
        preview = self.preview(nrows)
        preview = preview.where(pd.notnull(preview), None)
        rawPreview = self.rawPreview(10)
        colTypes = self._data.types

        # convert to the relative path from home
        filepath = filepath_from_home(self.path)

        dims = None if self.est_lines is None else [self.est_lines, preview.shape[1]]

        resp = {
            'name': self.name,
            'path': filepath,
            'options': self.options,
            'lastModified': self.last_modified,
            'size': self.filesize,
            'columns': preview.columns.tolist(),
            'colTypes': colTypes,
            'rawPreview': rawPreview,
            'preview': preview.fillna("NaN").astype(str).to_dict(orient='records'),
            **self.kwargs,
        }

        if dims is not None:
            resp['dims'] = dims

        return  { "outputList": [resp] }


class FileResultArray:
    """ Representation of the result of executing an
    action which produces a list of FileResults. """

    @log_it
    def __init__(self, name, fileResults):
        """ Constructor for FileResultArray class:

        Args:
            name: Name of the FileResult list in workspace.
            fileResults: List of FileResults.
        """
        self.name = name

        self.fileResults = fileResults

    @log_it
    def get_file_result(self, index):
        """ Returns the FileResult at the specified index.

        Args:
            index: Index of the FileResult in the list.
        """
        return self.fileResults[index]

    @log_it
    def data(self, index):
        """ Returns the full dataframe at the specified index.

        Args:
            index: Index of the FileResult in the list.
        """
        return self.fileResults[index].data

    @log_it
    def preview(self, index, nrows=100):
        """ Returns a short preview of the data at the specified index.

        Args:
            index: Index of the dataframe in the list.
            nrows: Number of rows to show in the preview
        """

        return self.fileResults[index].preview(nrows)

    @log_it
    def download_file(self, port=0):
        """ Returns a csv object of the data for download. """

        return self.fileResults[port].download_file()

    @log_it
    def response(self, nrows=100):
        """ Creates a response to pass to the front end. """

        # For each data frame in the list prepare a response
        outputList = []
        for fr in self.fileResults:
            outputList.append(fr.response(nrows)['outputList'][0])

        return { "outputList": outputList }

class CloudFileResult(FileResult):
    """ Representation of the result of executing an
    action which produces a file / dataframe from the cloud. """

    def __init__(self, ip_addr, bucket, filename, uname, secret_key, options=None,
                 data=None, last_modified=None, delay_load=True, in_mem=False):
        """ Constructor for CloudFileResult class:

        Args:
            name: Name of the file in workspace.
            path: File path in workspace.
            data: Dataframe containing the data.
            last_modified: timestamp for last modification.
        """
        filepath = f's3://{bucket}/{filename}'
        storage_options={"key": uname, "secret": secret_key,
                         "client_kwargs": dict(endpoint_url=f'https://{ip_addr}')}

        super().__init__(filename, filepath, options, data, last_modified)

        self.in_mem = in_mem

        self.ip_addr = ip_addr
        self.bucket = bucket
        self.uname = uname
        self.secret_key = secret_key

        self.storage_options = storage_options
        self.delay_load = delay_load
        
        self._data = Data(self.path, options=self.options,
                          is_cloud=True, storage_options=self.storage_options,
                          delay_load=self.delay_load,
                          ipaddr=ip_addr, bucket=bucket, datalake_file=filename,
                          uname=uname, secret_key=secret_key)

        if self.in_mem:
            self._data = DataInMem(data=self._data.to_pandas())


    @property
    def data(self):
        """ Returns the data object. """
        return self._data

    @log_it
    def get_filesize(self):
        """ Gets the filesize """
        return None
    
    @log_it
    def rawPreview(self, nlines=10):
        """ Creates a list of string from the raw file. """
        raw = []
        client = Minio(
            self.ip_addr,
            access_key=self.uname,
            secret_key=self.secret_key,
            secure=True
        )
        with client.select_object_content(
                self.bucket,
                self.name,
                SelectRequest(
                    f'SELECT * FROM S3Object limit {nlines}',
                    CSVInputSerialization(field_delimiter=self.options['delim'],
                                          record_delimiter=self.options['lineDelim'],
                                          file_header_info='NONE'),
                    CSVOutputSerialization(record_delimiter='\n'),
                    request_progress=False,
                ),
        ) as result:
            for data in result.stream(result._read()):
                raw = data.decode().split('\n')

        return raw


class RegressResult:
    """ Representation of the result of executing a
    regression action which produces a pandas dataframe. """

    @log_it
    def __init__(self, name, data):
        """ Constructor for RegressResult class:

        Args:
            name: Name of the file in workspace.
            data: Dataframe containing the data.
        """
        self.name = name
        self._data = data

    @log_it
    def data(self):
        """ Returns the full dataframe. """
        return self._data

    @log_it
    def preview(self, nrows=100):
        """ Returns a short preview of the data. """
        return self._data.head(nrows)

    @log_it
    def response(self):
        """ Creates a response to pass to the front end. """
        preview = self.preview()
        preview = preview.where(pd.notnull(preview), None)

        return {
                'name': self.name,
                'columns': preview.columns.tolist(),
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
    def get_patterns(self):
        """ Returns the list of patterns. """
        return self.model.get_patterns()

    @log_it
    def process_patterns(self):
        """ Converts the lb/ub format to 'in' format for
        categorical attributes. """

        labels = self.model.config.labels if hasattr(self.model, 'config') else {}
        types = self.train_df.types
        orderings = self.train_df.orderings
        patterns = self.get_patterns()

        new_patterns = []
        for idx, pattern in enumerate(patterns):
            processed_cstr = {}
            for attr, cstr in pattern.items():
                ncstr = {**cstr}
                if attr in labels:
                    lb, ub = cstr['lb'], cstr['ub']
                    levels = [lvl for idx, lvl in enumerate(labels[attr]) if lb <= idx <= ub]
                    ncstr = {'in': levels}

                if types[attr] == 'Ordinal':
                    lb, ub = cstr['lb'], cstr['ub']
                    levels = [lvl for idx, lvl in enumerate(orderings[attr]) if lb <= idx+1 <= ub]
                    ncstr = {'in': levels}

                processed_cstr[attr] = ncstr

            new_patterns.append({
                'ID': idx,
                'constraints': processed_cstr
            })

        return new_patterns

    @log_it
    def process_resp_patterns(self):
        """ Converts all values in patterns to string for transfer to front-end. """

        patterns = self.process_patterns()

        resp_patterns = []
        for pattern in patterns:
            processed_cstr = {}
            for attr, cstr in pattern['constraints'].items():
                ncstr = {**cstr}
                if 'in' not in cstr:
                    ncstr['lb'] = str(ncstr['lb'])
                    ncstr['ub'] = str(ncstr['ub'])

                processed_cstr[attr] = ncstr

            resp_patterns.append({
                'ID': pattern['ID'],
                'constraints': processed_cstr
            })

        return resp_patterns

    @log_it
    def response(self):
        """ Creates a response to pass to the front end. """
        summary = self.model.get_summary()
        patterns = self.process_resp_patterns()
        resp = ({
            **summary,
            'target': self.config['target'],
            'targetType': self.config['mineType'],
            'patterns': patterns
            })
        return { "outputList": [resp] }

class MultiTargetAnalystResult:
    """ Representation of patterns mined from the FPMiner. """
    @log_it
    def __init__(self, data, target, mine_type, patterns):
        """ Wrapper for a pre-trained barl model.

        Args:
            data: the data to be analyzed
            target: the target attributes
            mine_type: the mining type
            patterns: This list of mined patterns
        """

        self.result = {}
        self.target = target

        for t in target:
            self.result[t] = Analyst(data, t, mine_type=mine_type, patterns=patterns)

    @log_it
    def response(self):
        """ Creates a response to pass to the front end. """
        resp = {}
        for t in self.target:
            resp[t] = self.result[t].response()
        return json.dumps(resp)

class ModelResult:
    """ Representation of a trained sklearn model. """

    def __init__(self, model, target, error, shape, summary=None):
        """ Wrapper for sklearn model. """
        self.model = model
        self.target = target
        self.error = error
        self.nitems = shape[0]
        self.nattr = shape[1]
        self.summary = summary

    @log_it
    def predict(self, X):
        """ Wrapper for model prediction """
        return self.model.predict(X)

    @log_it
    def predict_proba(self, X):
        """ Wrapper for model prediction """
        return self.model.predict_proba(X)

    def predictor_columns(self):
        """ Returns the columns in the order it was trained. """
        return self.model.feature_names_in_

    def download_file(self, port=None):
        """ Download the serialized model as a picle file. """
        if 'statsmodels' in self.model.__class__.__module__:
            model = deepcopy(self.model)

            # remove the extra attributes added previously
            model.predict = model.raw_predict
            del model.raw_predict
            del model.feature_names_in_
            del model.score

            if hasattr(model, 'predict_proba'):
                del model.predict_proba
                  
            return pickle.dumps(model)
        
        return pickle.dumps(self.model)
        
    @log_it
    def response(self):
        """ Creates a response to pass to the front end. """
        resp = {
            'model_name': self.model.__class__.__name__,
            'modelType': 'classifier' if is_classifier(self.model) else 'regressor',
            'itemCount': self.nitems,
            'featureCount': self.nattr,
            'predictors': self.predictor_columns().tolist(),
            'error': self.error
        }

        if self.summary is not None:
            resp['summary'] = self.summary

        return  { "outputList": [resp] }

class EmptyResult:
    """ Class representing an empty result """
    @log_it
    def response(self):
        """ OK response """
        return 'OK'
    

class ErrorResult(Exception):
    """ Representation of patterns mined from the FPMiner. """
    @log_it
    def __init__(self, nodeID, action_type, err, data=None):
        """ Wrapper for a pre-trained barl model.

        Args:
            nodeId: ID of node the error occurred in.
            action_type: Action type.
            err: Error message.
            data: Additional data.
        """
        self.nodeID = nodeID
        self.action_type = action_type
        self.err = str(type(err).__name__) + ": " + str(err)
        self.data = data

        super().__init__(self.err)

    @log_it
    def response(self):
        """ Creates a response to pass to the front end. """
        if self.data is None:
            return {
                'nodeID': self.nodeID,
                'action_type': self.action_type,
                'err': self.err,
            }

        return {
            'nodeID': self.nodeID,
            'action_type': self.action_type,
            'err': self.err,
            'data': self.data,
        }

