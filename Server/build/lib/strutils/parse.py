""" Module for handling string processing functions. """

def split_replace_join(expr, cols, fun):
    """ Split the expression and replace the col values based on 'fun'. 
    
    Args:
        expr: String python expression to evaluate.
        cols: List of columns to find and replace 
              (assumed to be in descending order of length).
        fun: Function to apply to the relevant tokens.

    Returns:
        Modified expression.
    """
    if not cols:
        return expr
    
    delim = cols[0]
    tokens = expr.split(delim)
    
    processed = [split_replace_join(tok, cols[1:], fun) for tok in tokens]
    
    replace = fun(delim)    
    return replace.join(processed)
