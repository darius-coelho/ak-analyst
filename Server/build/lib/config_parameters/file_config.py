
import codecs

def get_default_file_options():
    """ generates a set of default options 
        for reading files with pandas or dask.        

    Returns:
        A dict with default options.
    """

    return {
        'encoding': None,
        'delim': ',',
        'lineDelim': None,
        'headerRow': 0,
        'startLine': 0,        
        'escapechar': None,
        'comment': None,
        'decimal': ".", 
        'thousands': None,
        'skipEmpty': True,
        'naOptions': []
    }

def _validate_options(options):
    """ validates a set of options for
        reading files with pandas or dask.
        
    Args:        
        options: a dict of options for reading files (encoding, header row etc).

    Returns:
        A dict with valid options.
    """
    if options is None:         
        return get_default_file_options()
    
    # set options to defaults if invalid
    def isValid(val):
        return val is not None and len(val) > 0

    options['encoding'] = options['encoding']
    delimiter = options['delim'] if isValid(options['delim']) else ","
    options['delim'] = codecs.decode(delimiter, 'unicode_escape')
    options['lineDelim'] = codecs.decode(options['lineDelim'], 'unicode_escape') if isValid(options['lineDelim']) else None    
    options['headerRow'] = int(options['headerRow'])
    options['startLine'] = int(options['startLine'])           
    options['escapechar'] = options['escapechar'] if isValid(options['escapechar']) else None
    options['comment'] = options['comment'] if isValid(options['comment']) else None
    options['decimal'] = options['decimal'] if isValid(options['decimal']) else "." 
    options['thousands'] = options['thousands'] if isValid(options['thousands']) else None
    options['skipEmpty'] = options['skipEmpty']

    return options
