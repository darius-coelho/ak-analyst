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

    processed = []

    for tok in tokens:
        next_cid = next((i+1 for i, c in enumerate(cols[1:]) if c in tok), None)
        if next_cid is None:
            processed.append(tok)
        else:
            processed.append(split_replace_join(tok, cols[next_cid:], fun))
        
    replace = fun(delim)    
    return replace.join(processed)
