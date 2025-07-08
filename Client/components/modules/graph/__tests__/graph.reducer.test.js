import { createTestStore } from '../../store';

import reducer, { isActionReady } from '../graph.reducer';
import * as actions from '../graph.actions';
import { createFileOutput, FILE, ReadyStatus } from '../components/Action.prototype';

import expect from 'expect';

window.setImmediate = window.setTimeout;

jest.mock('mixpanel-browser');

describe('graph reducer', () => {
  window.alert = jest.fn();

  it('should return the initial state', ()=>{
    const expected = {
      id: 0,
      nodes: {},
      edges: [],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };
    
    expect(reducer(undefined, {})).toEqual(expected);
  });
  
  it('should handle ADD_NODE action on initial state.', () => {
    const addAction = actions.addNode({type: 'LOAD_FILE', pos: {x: 0, y: 0}});
    const expected = {
      id: 1,
      nodes: {
        0: {
          ...addAction.node,           
          config: { 
            isAvailable: false,
	    inMemory: true,
            options:{
              encoding: 'utf_8',
              delim: ",",
              lineDelim: "",
              headerRow: 0,          
              startLine: 0,  
              escapechar: "",
              comment: "",
              thousands: "",
              decimal: ".",        
              skipEmpty: true,
              naOptions: []
            }
          },
          output: [null], 
          isLoading: false, 
	  readyStatus: ReadyStatus.Unready,
        }
      },
      edges:[],
      notes: [],
      focusNodes: [0],
      focusEdges: [],
      focusNotes: []
    };
    
    expect(reducer(undefined, addAction)).toEqual(expected);
  });
  
  it('should handle ADD_NODE action on other states.', () => {
    const addAction = actions.addNode({type: 'LOAD_FILE', pos: {x: 1, y: 10}});

    const startState = {
      id: 1,
      nodes: {
        0: {
          type: 'LOAD_FILE', 
          pos: {x: 0, y: 0},
          config: { 
            isAvailable: false,
            options:{
              encoding: 'utf_8',
              delim: ",",
              lineDelim: "",
              headerRow: 0,          
              startLine: 0,  
              escapechar: "",
              comment: "",
              thousands: "",
              decimal: ".",        
              skipEmpty: true,
              naOptions: []
            }
          }, 
          output: null, 
          isLoading: false, 
	  readyStatus: ReadyStatus.Unready,
        }
      },
      edges:[],
      notes: [],
      focusNodes: [0],
      focusEdges: [],
      focusNotes: []
    };
    const expectedStartState = {...startState}
    
    const expected = {
      id: 2,
      nodes: {
        0: startState.nodes[0],
	1: {
	  ...addAction.node, 
	  config: {
	    inMemory: true,
            isAvailable: false,
            options:{
              encoding: 'utf_8',
              delim: ",",
              lineDelim: "",
              headerRow: 0,          
              startLine: 0,  
              escapechar: "",
              comment: "",
              thousands: "",
              decimal: ".",        
              skipEmpty: true,
              naOptions: []
            }
          }, 
          output: [null], 
          isLoading: false, 
	  readyStatus: ReadyStatus.Unready,
        }
      },
      edges: [],
      notes: [],
      focusNodes: [1],
      focusEdges: [],
      focusNotes: []
    };

    expect(reducer(startState, addAction)).toEqual(expected);

    // test no side-effects.
    expect(startState).toEqual(expectedStartState);    
  });
  
  it('should handle ADD_EDGE action on initial state.', () => {
    const addAction = actions.addEdge({'src': 0, 'dst': 1});

    const startState = {
      id: 1,
      nodes: {
	0: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	},
	1: {
	  type: 'CLEANSE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	},
      },
      edges:[],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };
    
    const expected = {
      id: 1,
      nodes: {
	0: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	},
	1: {
	  type: 'CLEANSE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.PrevUnready,
	},
      },
      edges:[{'src': 0, 'dst': 1}],
      notes: [],
      focusNodes: [],
      focusEdges: [0],
      focusNotes: []
    };

    expect(reducer(startState, addAction)).toEqual(expected);
  });

  it('should handle ADD_NOTE action on initial state.', () => {
    const addAction = actions.addNote({
                                x: 10,
                                y: 10,
                                width: 180,
                                height: 70,
                                content: "",
                                isEditing: true
                              });
    const expected = {
      id: 0,
      nodes: {},
      edges:[],
      notes: [
        {
          x: 10,
          y: 10,
          width: 180,
          height: 70,
          content: "",
          isEditing: true
        }
      ],
      focusNodes: [],
      focusEdges: [],
      focusNotes: [0]
    };
    
    expect(reducer(undefined, addAction)).toEqual(expected);
  });

  it('should handle ADD_NOTE action on other states.', () => {
    const addAction = actions.addNote({
                                x: 30,
                                y: 30,
                                width: 180,
                                height: 70,
                                content: "",
                                isEditing: true
                              });

    const startState = {
      id: 1,
      nodes: {
        0: {
          type: 'LOAD_FILE', 
          pos: {x: 0, y: 0},
          config: { 
            isAvailable: false,
            options:{
              encoding: 'utf_8',
              delim: ",",
              lineDelim: "",
              headerRow: 0,          
              startLine: 0,  
              escapechar: "",
              comment: "",
              thousands: "",
              decimal: ".",        
              skipEmpty: true,
              naOptions: []
            }
          }, 
          output: null, 
          isLoading: false, 
          readyStatus: ReadyStatus.Unready,
        }
      },
      edges:[],
      notes: [
        {
          x: 10,
          y: 10,
          width: 180,
          height: 70,
          content: "test",
          isEditing: true
        }
      ],
      focusNodes: [],
      focusEdges: [],
      focusNotes: [0]
    };
    const expectedStartState = {...startState}

    const expected = {
      id: 1,
      nodes: {
        0: startState.nodes[0]
      },
      edges:[],
      notes: [
        startState.notes[0],
        {
          x: 30,
          y: 30,
          width: 180,
          height: 70,
          content: "",
          isEditing: true
        }
      ],
      focusNodes: [],
      focusEdges: [],
      focusNotes: [1]
    };
    
    expect(reducer(startState, addAction)).toEqual(expected);

    // test no side-effects.
    expect(startState).toEqual(expectedStartState); 
  });

  it('should handle SET_NODE_POS action.', () => {
    let newPos = {x: 10, y: 5};
    const focusAction = actions.setNodePos(3, newPos);
    const startState = {
      id: 1,
      nodes: {
	0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}},
	1: {type: 'CLEANSE', pos: {x: 0, y: 0}},
	3: {type: 'CLEANSE', pos: {x: 0, y: 0}}
      },
      edges:[],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };
    
    const expected = {
      id: 1,
      nodes: {
	0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}},
	1: {type: 'CLEANSE', pos: {x: 0, y: 0}},
	3: {type: 'CLEANSE', pos: {x: 10, y: 5}}
      },
      edges: [],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };

    expect(reducer(startState, focusAction)).toEqual(expected);    
  });

  it('should handle SET_NODE_FOCUS action.', () => {
    const focusAction = actions.setNodeFocus([0]);
    const startState = {
      id: 1,
      nodes: {0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}}},
      edges:[],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };
    
    const expected = {
      id: 1,
      nodes: {0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}}},
      edges: [],
      notes: [],
      focusNodes: [0],
      focusEdges: [],
      focusNotes: []
    };

    expect(reducer(startState, focusAction)).toEqual(expected);
  });

  it('should handle SET_EDGE_FOCUS action.', () => {
    const focusAction = actions.setEdgeFocus([0]);
    const startState = {
      id: 1,
      nodes: {0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}}},
      edges:[{'src': 0, 'dst': 1}],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };
    
    const expected = {
      id: 1,
      nodes: {0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}}},
      edges:[{'src': 0, 'dst': 1}],
      notes: [],
      focusNodes: [],
      focusEdges: [0],
      focusNotes: []
    };

    expect(reducer(startState, focusAction)).toEqual(expected);
  });

  it('should handle SET_NOTE_FOCUS action.', () => {
    const focusAction = actions.setNoteFocus([0]);
    const startState = {
      id: 1,
      nodes: {0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}}},
      edges:[],
      notes: [{
        x: 10,
        y: 10,
        width: 180,
        height: 70,
        content: "test",
        isEditing: false
      }],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };
    
    const expected = {
      id: 1,
      nodes: {0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}}},
      edges:[],
      notes: [{
        x: 10,
        y: 10,
        width: 180,
        height: 70,
        content: "test",
        isEditing: false
      }],
      focusNodes: [],
      focusEdges: [],
      focusNotes: [0]
    };

    expect(reducer(startState, focusAction)).toEqual(expected);
  });

  it('should handle CLEAR_FOCUS action.', () => {
    const focusAction = actions.clearFocus();
    const startState = {
      id: 1,
      nodes: {0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}}},
      edges:[{'src': 0, 'dst': 1}],
      notes: [],
      focusNodes: [0],
      focusEdges: [0],
      focusNotes: []
    };
    
    const expected = {
      id: 1,
      nodes: {0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}}},
      edges:[{'src': 0, 'dst': 1}],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };

    expect(reducer(startState, focusAction)).toEqual(expected);
  });

  it('should handle COPY_FOCUS action.', () => {
    const copyAction = actions.copyFocus();
    const startState = {
      id: 1,
      nodes: {0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}}},
      edges:[{'src': 0, 'dst': 1}],
      notes: [],
      focusNodes: [0],
      focusEdges: [0],
      focusNotes: []
    };
    
    const expected = {
      id: 1,
      nodes: {0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}}},
      edges:[{'src': 0, 'dst': 1}],
      notes: [],
      focusNodes: [0],
      focusEdges: [0],
      focusCopy: [0],
      focusNotes: []
    };

    expect(reducer(startState, copyAction)).toEqual(expected);
  });

  it('should handle PASTE_FOCUS action (CLEANSE)', () => {
    const copyAction = actions.copyFocus();
    const pasteAction = actions.pasteFocus();
    
    const startState = {
      id: 2,
      nodes: {
	0: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  output: null, 
	  readyStatus: ReadyStatus.OK,
          isLoading: false,
	},
	1: {
	  type: 'CLEANSE', pos: {x: 20, y: 0},
	  config: {transformations: [], deleted: []},
	  output: null,
	  readyStatus: ReadyStatus.OK
	},	  
      },
      edges:[{'src': 0, 'dst': 1}],
      notes: [],
      focusNodes: [1],
      focusEdges: [0],
      focusNotes: []
    };
    
    const expected = {
      id: 3,
      nodes: {
	0: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  output: null, 
	  readyStatus: ReadyStatus.OK,
          isLoading: false,
	},
	1: {
	  type: 'CLEANSE', pos: {x: 20, y: 0},
	  config: {transformations: [], deleted: []},
	  output: null,
	  readyStatus: ReadyStatus.OK,
	},
	2: {
	  type: 'CLEANSE', pos: {x: 20, y: 80},
	  config: {transformations: [], deleted: []},
	  output: null,
	  readyStatus: ReadyStatus.PrevMissing,
	},	  
      },
      edges:[{'src': 0, 'dst': 1}],
      notes: [],
      focusNodes: [1],
      focusEdges: [0],
      focusCopy: [1],
      focusNotes: []
    };

    const copyState = reducer(startState, copyAction);
    expect(reducer(copyState, pasteAction)).toEqual(expected);
  });

  it('should handle PASTE_FOCUS action (LOAD)', () => {
    const copyAction = actions.copyFocus();
    const pasteAction = actions.pasteFocus();
    
    const startState = {
      id: 1,
      nodes: {
	0: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  config:  {
            isAvailable: true,
	    path: 'test.txt',
            options:{
              encoding: 'utf_8',
              delim: ",",
              lineDelim: "",
              headerRow: 0,          
              startLine: 0,          
              escapechar: "",
              comment: "",
              thousands: "",
              decimal: ".",        
              skipEmpty: true,
              naOptions: []
            },
	  },
	  output: null, 
	  readyStatus: ReadyStatus.OK,
          isLoading: false,
	}
      },
      edges:[],
      notes: [],
      focusNodes: [0],
      focusEdges: [0],
      focusNotes: []
    };
    
    const expected = {
      id: 2,
      nodes: {
	0: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  config:  {
            isAvailable: true,
	    path: 'test.txt',
            options:{
	      encoding: 'utf_8',
	      delim: ",",
	      lineDelim: "",
	      headerRow: 0,          
	      startLine: 0,          
	      escapechar: "",
	      comment: "",
	      thousands: "",
	      decimal: ".",        
	      skipEmpty: true,
	      naOptions: []
            },
	  },
	  output: null, 
	  readyStatus: ReadyStatus.OK,
          isLoading: false,
	},
	1: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 80},
	  config:  {
            isAvailable: true,
	    path: 'test.txt',
            options:{
	      encoding: 'utf_8',
	      delim: ",",
	      lineDelim: "",
	      headerRow: 0,          
	      startLine: 0,          
	      escapechar: "",
	      comment: "",
	      thousands: "",
	      decimal: ".",        
	      skipEmpty: true,
	      naOptions: []
            },
	  },
	  output: null, 
	  readyStatus: ReadyStatus.OK,
          isLoading: false,
	},
      },
      edges:[],
      notes: [],
      focusNodes: [0],
      focusEdges: [0],
      focusCopy: [0],
      focusNotes: []
    };

    const copyState = reducer(startState, copyAction);
    expect(reducer(copyState, pasteAction)).toEqual(expected);
  });

  it('should handle DELETE_FOCUS action simple 2.', () => {
    const focusAction = actions.deleteFocus();
    
    const startState = {
      id: 1,
      nodes: {0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}}},
      edges:[{'src': 2, 'dst': 3}],
      notes: [],
      focusNodes: [0],
      focusEdges: [],
      focusNotes: []
    };
    
    const expected = {
      id: 1,
      nodes: {},
      edges:[{'src': 2, 'dst': 3}],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };

    expect(reducer(startState, focusAction)).toEqual(expected);
  });  

  it('should handle DELETE_FOCUS action simple 3.', () => {
    const focusAction = actions.deleteFocus();
    
    const startState = {
      id: 1,
      nodes: {
	0: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	},
	3: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	}
      },
      edges:[{'src': 2, 'dst': 3}],
      notes: [],
      focusNodes: [],
      focusEdges: [0],
      focusNotes: []
    };
    
    const expected = {
      id: 1,
      nodes: {
	0: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	},
	3: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	}
      },
      notes: [],
      edges:[],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };

    expect(reducer(startState, focusAction)).toEqual(expected);
  });  

  it('should handle DELETE_FOCUS action 1.', () => {
    const focusAction = actions.deleteFocus();
    
    const startState = {
      id: 1,
      nodes: {
	10: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	},
	11: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	},
	12: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,	
	  config: {}
	}
      },
      edges:[
	{'src': 10, 'dst': 12},
	{'src': 10, 'dst': 11}
      ],
      notes: [],
      focusNodes: [10, 11],
      focusEdges: [],
      focusNotes: []
    };
    
    const expected = {
      id: 1,
      nodes: {
	12: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	}
      },
      edges:[],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };

    expect(reducer(startState, focusAction)).toEqual(expected);
  });

  it('should handle DELETE_FOCUS action 2.', () => {
    const focusAction = actions.deleteFocus();
    
    const startState = {
      id: 1,
      nodes: {
	10: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	},
	11: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	},
	12: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,	
	  config: {}
	}
      },
      edges:[
	{'src': 10, 'dst': 12},
	{'src': 10, 'dst': 11},
	{'src': 11, 'dst': 12},
      ],
      notes: [],
      focusNodes: [10],
      focusEdges: [],
      focusNotes: []
    };
    
    const expected = {
      id: 1,
      nodes: {
	11: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	},
	12: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.PrevUnready,
	  config: {}
	},
      },
      edges:[
	{'src': 11, 'dst': 12},
      ],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };

    expect(reducer(startState, focusAction)).toEqual(expected);
  });
  
  it('should handle DELETE_FOCUS action 3.', () => {
    const focusAction = actions.deleteFocus();
    
    const startState = {
      id: 1,
      nodes: {
	10: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	},
	11: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	},
	12: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,	
	  config: {}
	}
      },
      edges:[
	{'src': 10, 'dst': 12},
	{'src': 10, 'dst': 11},
	{'src': 11, 'dst': 12},
      ],
      notes: [],
      focusNodes: [10],
      focusEdges: [2],
      focusNotes: []
    };
    
    const expected = {
      id: 1,
      nodes: {
	11: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	},
	12: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	},
      },
      edges:[],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };

    expect(reducer(startState, focusAction)).toEqual(expected);
  });  

  it('should handle DELETE_FOCUS action 4.', () => {
    const focusAction = actions.deleteFocus();
    
    const startState = {
      id: 1,
      nodes: {
	10: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	},
	11: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	},
	12: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	}
      },
      edges:[
	{'src': 10, 'dst': 12},
	{'src': 10, 'dst': 11},
	{'src': 11, 'dst': 12},
      ],
      notes: [],
      focusNodes: [],
      focusEdges: [0,2],
      focusNotes: []
    };
    
    const expected = {
      id: 1,
      nodes: {
	10: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	},
	11: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	},
	12: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	}
      },
      edges:[
	{'src': 10, 'dst': 11},
      ],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };
    
    expect(reducer(startState, focusAction)).toEqual(expected);
  });

  it('should handle DELETE_FOCUS action 5.', () => {
    const focusAction = actions.deleteFocus();
    
    const startState = {
      id: 1,
      nodes: {
	10: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	},
	11: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	},
	12: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: {}
	}
      },
      edges:[
	{'src': 10, 'dst': 12},
	{'src': 10, 'dst': 11},
	{'src': 11, 'dst': 12},
      ],
      notes: [],
      focusNodes: [10, 12],
      focusEdges: [],
      focusNotes: []
    };
    
    const expected = {
      id: 1,
      nodes: {	
	11: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,	
	  config: {}
	},
      },
      edges:[],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };

    expect(reducer(startState, focusAction)).toEqual(expected);
  });

  it('should handle SET_CONFIG action.', () => {
    const configAction = actions.setConfig(10, {
      isAvailable: true,
      file:'stroke.csv',
      path:'data/stroke.csv'
    });
    
    const startState = {
      id: 1,
      nodes: {
        10: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  config: null,
          output: null,
	  readyStatus: ReadyStatus.Unready
	},
        11: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  config: null,
          output: null,
	  readyStatus: ReadyStatus.Unready	  
	},
        12: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  config: null,
          output: null,
	  readyStatus: ReadyStatus.Unready
	}
      },
      edges:[
        {'src': 10, 'dst': 12},
        {'src': 10, 'dst': 11},
        {'src': 11, 'dst': 12},
      ],
      notes: [],
      focusNodes: [10, 12],
      focusEdges: [],
      focusNotes: []
    };
    
    const expected = {
      id: 1,
      nodes: {	
        10: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  config: {isAvailable: true, file:'stroke.csv', path:'data/stroke.csv'},
          output: [null],
	  readyStatus: ReadyStatus.OK
	},
        11: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  config: null,
          output: null,
	  readyStatus: ReadyStatus.Unready
	},
        12: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  config: null,
          output: null,
	  readyStatus: ReadyStatus.Unready
	}
      },
      edges:[
        {'src': 10, 'dst': 12},
        {'src': 10, 'dst': 11},
        {'src': 11, 'dst': 12},
      ],
      notes: [],
      focusNodes: [10, 12],
      focusEdges: [],
      focusNotes: []
    };
    expect(reducer(startState, configAction)).toEqual(expected);
  });  

  it('should handle SET_NOTE_CONFIG action on other states.', () => {
    const noteConfigAction = actions.setNoteConfig(0, {content: "test text"});

    const startState = {
      id: 1,
      nodes: {},
      edges:[],
      notes: [
        {
          x: 10,
          y: 10,
          width: 180,
          height: 70,
          content: "",
          isEditing: true
        }
      ],
      focusNodes: [],
      focusEdges: [],
      focusNotes: [0]
    };

    const expected = {
      id: 1,
      nodes: {},
      edges:[],
      notes: [        
        {
          x: 10,
          y: 10,
          width: 180,
          height: 70,
          content: "test text",
          isEditing: true
        }
      ],
      focusNodes: [],
      focusEdges: [],
      focusNotes: [0]
    };
    
    expect(reducer(startState, noteConfigAction)).toEqual(expected);
  });

  it('should handle SET_OUTPUT action.', () => {

    const file = {
      name: 'file1.csv',
      path: './file1.csv',
      columns: ['a', 'b'],
      preview: [{'a': 1, 'b': 2}],
    };

    const expectedFO = {type: FILE, ...file};
    const outputAction = actions.setOutput(10, createFileOutput(file));
    const startState = {
      id: 1,
      nodes: {
	10: {type: 'LOAD_FILE', pos: {x: 0, y: 0}, config: null, output: null},
	11: {type: 'LOAD_FILE', pos: {x: 0, y: 0}, config: null, output: null},
	12: {type: 'LOAD_FILE', pos: {x: 0, y: 0}, config: null, output: null}
      },
      edges:[
        {'src': 10, 'dst': 12},
        {'src': 10, 'dst': 11},
        {'src': 11, 'dst': 12},
      ],
      notes: [],
      focusNodes: [10, 12],
      focusEdges: [],
      focusNotes: []
    };
    
    const expected = {
      id: 1,
      nodes: {	
	10: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: null,
	  output: expectedFO
	},
	11: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: null,
	  output: null
	},
	12: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: null,
	  output: null
	}
      },
      edges:[
	      {'src': 10, 'dst': 12},
	      {'src': 10, 'dst': 11},
	      {'src': 11, 'dst': 12},
      ],
      notes: [],
      focusNodes: [10, 12],
      focusEdges: [],
      focusNotes: []
    };

    expect(reducer(startState, outputAction)).toEqual(expected);
  });  

  it('should test isActionReady false.', () => {    
    const startState = {
      id: 1,
      nodes: {
	10: {type: 'LOAD_FILE', pos: {x: 0, y: 0}, config: null, output: null},
	11: {type: 'LOAD_FILE', pos: {x: 0, y: 0}, config: null, output: null},
	12: {type: 'JOIN', pos: {x: 0, y: 0}, config: null, output: null}
      },
      edges:[
	{'src': 10, 'dst': 12},
	{'src': 10, 'dst': 11},
	{'src': 11, 'dst': 12},
      ],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };

    expect(isActionReady(startState.nodes, startState.edges, 10)).toBe(ReadyStatus.Unready);       
  });

  it('should test isActionReady true.', () => {
    const file1 = {
      name: "file1.csv",
      path: "./file1.csv",
      columns: ['a', 'b', 'c'],
      preview: [{'a': 1, 'b': 2, 'c': 3}]
    };
    
    const file2 = {
      name: "file2.csv",
      path: "./file2.csv",
      columns: ['a1', 'b1', 'c1'],
      preview: [{'a1': 1, 'b1': 2, 'c1': 3}]
    };

    const fileOutput1 = createFileOutput(file1);
    const fileOutput2 = createFileOutput(file2);

    const startState = {
      id: 1,
      nodes: {
        10: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: null,  
          output: [fileOutput1],
	  readyStatus: ReadyStatus.OK
        },
        11: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: null,
          output: [fileOutput2],
	  readyStatus: ReadyStatus.OK
        },
        12: {
          type: 'JOIN',
          pos: {x: 0, y: 0},
          config: {how: 'left', join: [['a', 'a1']]},
          output: [null],
	  readyStatus: ReadyStatus.OK
        }
      },
      edges:[
        {'src': 10, srcPort:0, 'dst': 12, dstPort:0},
        {'src': 11, srcPort:0, 'dst': 12, dstPort:0},
      ],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };

    expect(isActionReady(startState.nodes, startState.edges, 12)).toBe(ReadyStatus.OK);       
    
  });

  it('should test ready status on edge deletion.', () => {
    const file1 = {
      name: "file1.csv",
      path: "./file1.csv",
      columns: ['a', 'b', 'c'],
      preview: [{'a': 1, 'b': 2, 'c': 3}]
    };
    
    const file2 = {
      name: "file2.csv",
      path: "./file2.csv",
      columns: ['a1', 'b1', 'c1'],
      preview: [{'a1': 1, 'b1': 2, 'c1': 3}]
    };

    const fileOutput1 = createFileOutput(file1);
    const fileOutput2 = createFileOutput(file2);

    const deleteAction = actions.deleteFocus();
    

    const startState = {
      id: 1,
      nodes: {
        10: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: null,
          outPort: 0,
          output: [fileOutput1],
	  readyStatus: ReadyStatus.OK
        },
        11: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: null,
          outPort: 0,
          output: [fileOutput2],
	  readyStatus: ReadyStatus.OK
        },
        12: {
          type: 'JOIN',
          pos: {x: 0, y: 0},
          config: {how: 'left', join: [['a', 'a1']]},
          outPort: 0,
          output: [null],          
	  readyStatus: ReadyStatus.OK
        }
      },
      edges:[
        {'src': 10, 'dst': 12},
        {'src': 10, 'dst': 11},
        {'src': 11, 'dst': 12},
      ],
      notes: [],
      focusNodes: [],
      focusEdges: [0],
      focusNotes: []
    };

    const expected = {
      id: 1,
      nodes: {
        10: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: null,
          outPort: 0,
          output: [fileOutput1],          
	  readyStatus: ReadyStatus.OK
        },
        11: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: null,
          outPort: 0,
          output: [fileOutput2],
	  readyStatus: ReadyStatus.OK
        },
        12: {
          type: 'JOIN',
          pos: {x: 0, y: 0},
          config: {how: 'left', join: [['a', 'a1']]},
          outPort: 0,
          output: [null],          
	  readyStatus: ReadyStatus.PrevNoOutput
        }
      },
      edges:[        
        {'src': 10, 'dst': 11},
        {'src': 11, 'dst': 12},
      ],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };

    expect(reducer(startState, deleteAction)).toEqual(expected);
  });

  it('should test ready status on node deletion.', () => {
    const file1 = {
      name: "file1.csv",
      path: "./file1.csv",
      columns: ['a', 'b', 'c'],
      preview: [{'a': 1, 'b': 2, 'c': 3}]
    };
    
    const file2 = {
      name: "file2.csv",
      path: "./file2.csv",
      columns: ['a1', 'b1', 'c1'],
      preview: [{'a1': 1, 'b1': 2, 'c1': 3}]
    };

    const fileOutput1 = createFileOutput(file1);
    const fileOutput2 = createFileOutput(file2);

    const deleteAction = actions.deleteFocus();
    const startState = {
      id: 1,
      nodes: {
	10: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  config: null,
	  output: fileOutput1,
	  readyStatus: ReadyStatus.OK
	},
	11: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  config: null,
	  output: fileOutput2,
	  readyStatus: ReadyStatus.OK
	},
	12: {
	  type: 'JOIN',
	  pos: {x: 0, y: 0},
	  config: {join: [['a', 'a1']], how: 'left'},
	  output: null,
	  readyStatus: ReadyStatus.OK
	}
      },
      edges:[
	{'src': 10, 'dst': 12},
	{'src': 11, 'dst': 12},
      ],
      notes: [],
      focusNodes: [10],
      focusEdges: [],
      focusNotes: []
    };

    const expected = {
      id: 1,
      nodes: {
	11: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  config: null,
	  output: fileOutput2,
	  readyStatus: ReadyStatus.OK
	},
	12: {
	  type: 'JOIN',
	  pos: {x: 0, y: 0},
	  config: {join: [['a', 'a1']], how: 'left'},
	  output: null,
	  readyStatus: ReadyStatus.PrevNoOutput
	}
      },
      edges:[
	{'src': 11, 'dst': 12},
      ],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };

    expect(reducer(startState, deleteAction)).toEqual(expected);
  });

  it('should test ready status propagation on node deletion.', () => {
    const file1 = {
      name: "file1.csv",
      path: "./file1.csv",
      columns: ['a', 'b', 'c'],
      preview: [{'a': 1, 'b': 2, 'c': 3}]
    };
    
    const file2 = {
      name: "file2.csv",
      path: "./file2.csv",
      columns: ['a1', 'b1', 'c1'],
      preview: [{'a1': 1, 'b1': 2, 'c1': 3}]
    };

    const fileOutput1 = createFileOutput(file1);
    const fileOutput2 = createFileOutput(file2);

    const deleteAction = actions.deleteFocus();
    const startState = {
      id: 1,
      nodes: {
	10: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  config: null,
	  outPort: 0,
	  output: [fileOutput1],
	  readyStatus: ReadyStatus.OK
	},
	11: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  config: null,
	  outPort: 0,
	  output: [fileOutput2],
          readyStatus: ReadyStatus.OK
	},
	12: {
	  type: 'JOIN',
	  pos: {x: 0, y: 0},
	  config: {join: [['a', 'a1']], how: 'left'},
	  outPort: 0,
	  output: null,
	  readyStatus: ReadyStatus.OK
	},
	13: {
	  type: 'JOIN',
	  pos: {x: 0, y: 0},
	  config: {join: [['a', 'a1']], how: 'left'},
	  outPort: 0,
	  output: null,
	  readyStatus: ReadyStatus.OK
	}
      },
      edges:[
	{'src': 10, 'srcPort': 0, 'dst': 12, 'dstPort': 0},
	{'src': 11, 'srcPort': 0, 'dst': 12, 'dstPort': 0},
	{'src': 11, 'srcPort': 0, 'dst': 13, 'dstPort': 0},	
	{'src': 12, 'srcPort': 0, 'dst': 13, 'dstPort': 0},
      ],
      notes: [],
      focusNodes: [10],
      focusEdges: [],
      focusNotes: []
    };

    const expected = {
      id: 1,
      nodes: {
	11: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  config: null,
	  outPort: 0,
	  output: [fileOutput2],
	  readyStatus: ReadyStatus.OK
	},
	12: {
	  type: 'JOIN',
	  pos: {x: 0, y: 0},
	  config: {join: [['a', 'a1']], how: 'left'},
	  outPort: 0,
	  output: null,
	  readyStatus: ReadyStatus.PrevMissing
	},
	13: {
	  type: 'JOIN',
	  pos: {x: 0, y: 0},
	  config: {join: [['a', 'a1']], how: 'left'},
	  outPort: 0,
	  output: null,
	  readyStatus: ReadyStatus.PrevNoOutput
	}
      },
      edges:[
	{'src': 11, 'srcPort': 0, 'dst': 12, 'dstPort': 0},
	{'src': 11, 'srcPort': 0, 'dst': 13, 'dstPort': 0},	
	{'src': 12, 'srcPort': 0, 'dst': 13, 'dstPort': 0},
      ],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };

    expect(reducer(startState, deleteAction)).toEqual(expected);

    const startState2 = {
      id: 1,
      nodes: {
	10: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  config: null,
	  output: [fileOutput1],	
          readyStatus: ReadyStatus.OK
	},
	11: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  config: null,
	  output: [fileOutput2],	
          readyStatus: ReadyStatus.OK
	},
	12: {
	  type: 'JOIN',
	  pos: {x: 0, y: 0},
	  config: {join: [['a', 'a1']], how: 'left'},
	  output: null,
	  readyStatus: ReadyStatus.OK
	},
	13: {
	  type: 'JOIN',
	  pos: {x: 0, y: 0},
	  config: {join: [['a', 'a1']], how: 'left'},
	  output: null,
	  readyStatus: ReadyStatus.OK
	},
	14: {
	  type: 'JOIN',
	  pos: {x: 0, y: 0},
	  config: {join: [['a', 'a1']], how: 'left'},
	  output: null,
	  readyStatus: ReadyStatus.OK
	}
      },
      edges:[
	{'src': 10, 'srcPort': 0, 'dst': 12, 'dstPort': 0},
	{'src': 11, 'srcPort': 0, 'dst': 12, 'dstPort': 0},
	{'src': 11, 'srcPort': 0, 'dst': 13, 'dstPort': 0},	
	{'src': 12, 'srcPort': 0, 'dst': 13, 'dstPort': 0},
	{'src': 12, 'srcPort': 0, 'dst': 14, 'dstPort': 0},
      ],
      notes: [],
      focusNodes: [10],
      focusEdges: [],
      focusNotes: []
    };

    const expected2 = {
      id: 1,
      nodes: {
	11: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  config: null,
	  output: [fileOutput2],
	  readyStatus: ReadyStatus.OK
	},
	12: {
	  type: 'JOIN',
	  pos: {x: 0, y: 0},
	  config: {join: [['a', 'a1']], how: 'left'},
	  output: null,
	  readyStatus: ReadyStatus.PrevMissing
	},
	13: {
	  type: 'JOIN',
	  pos: {x: 0, y: 0},
	  config: {join: [['a', 'a1']], how: 'left'},
	  output: null,
	  readyStatus: ReadyStatus.PrevNoOutput
	},
	14: {
	  type: 'JOIN',
	  pos: {x: 0, y: 0},
	  config: {join: [['a', 'a1']], how: 'left'},
	  output: null,
	  readyStatus: ReadyStatus.PrevNoOutput
	}
      },
      edges:[
	{'src': 11, 'srcPort': 0, 'dst': 12, 'dstPort': 0},
	{'src': 11, 'srcPort': 0, 'dst': 13, 'dstPort': 0},	
	{'src': 12, 'srcPort': 0, 'dst': 13, 'dstPort': 0},
	{'src': 12, 'srcPort': 0, 'dst': 14, 'dstPort': 0},
      ],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };

    expect(reducer(startState2, deleteAction)).toEqual(expected2);

    const startState3= {
      id: 1,
      nodes: {
	10: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  config: null,
	  output: [fileOutput1],
	  readyStatus: ReadyStatus.OK
	},
	11: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  config: null,
	  output: [fileOutput2],
	  readyStatus: ReadyStatus.OK
	},
	12: {
	  type: 'JOIN',
	  pos: {x: 0, y: 0},
	  config: {join: [['a', 'a1']], how: 'left'},
	  output: null,
	  readyStatus: ReadyStatus.OK
	},
	13: {
	  type: 'JOIN',
	  pos: {x: 0, y: 0},
	  config: {join: [['a', 'a1']], how: 'left'},
	  output: null,
	  readyStatus: ReadyStatus.OK
	},
	14: {
	  type: 'JOIN',
	  pos: {x: 0, y: 0},
	  config: {join: [['a', 'a1']], how: 'left'},
	  output: null,
	  readyStatus: ReadyStatus.OK
	}
      },
      edges:[
	{'src': 10, 'srcPort': 0, 'dst': 12, 'dstPort': 0},
	{'src': 11, 'srcPort': 0, 'dst': 12, 'dstPort': 0},
	{'src': 11, 'srcPort': 0, 'dst': 13, 'dstPort': 0},	
	{'src': 12, 'srcPort': 0, 'dst': 13, 'dstPort': 0},
	{'src': 13, 'srcPort': 0, 'dst': 14, 'dstPort': 0},
      ],
      notes: [],
      focusNodes: [10],
      focusEdges: [],
      focusNotes: []
    };

    const expected3 = {
      id: 1,
      nodes: {
	11: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  config: null,
	  output: [fileOutput2],
	  readyStatus: ReadyStatus.OK
	},
	12: {
	  type: 'JOIN',
	  pos: {x: 0, y: 0},
	  config: {join: [['a', 'a1']], how: 'left'},
	  output: null,
          readyStatus: ReadyStatus.PrevMissing
	},
	13: {
	  type: 'JOIN',
	  pos: {x: 0, y: 0},
	  config: {join: [['a', 'a1']], how: 'left'},
	  output: null,
	  readyStatus: ReadyStatus.PrevNoOutput
	},
	14: {
	  type: 'JOIN',
	  pos: {x: 0, y: 0},
	  config: {join: [['a', 'a1']], how: 'left'},
	  output: null,
          readyStatus: ReadyStatus.PrevNoOutput
	}

      },
      edges:[
	{'src': 11, 'srcPort': 0, 'dst': 12, 'dstPort': 0},
	{'src': 11, 'srcPort': 0, 'dst': 13, 'dstPort': 0},	
	{'src': 12, 'srcPort': 0, 'dst': 13, 'dstPort': 0},
	{'src': 13, 'srcPort': 0, 'dst': 14, 'dstPort': 0},
      ],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };
    expect(reducer(startState3, deleteAction)).toEqual(expected3);
  });
  
  it('should handle is ready status on ADD_EDGE action.', () => {
    const addAction = actions.addEdge({'src': 11, 'srcPort': 0, 'dst': 12, 'dstPort': 0});
    
    const file1 = {
      name: "file1.csv",
      path: "./file1.csv",
      columns: ['a', 'b', 'c'],
      preview: [{'a': 1, 'b': 2, 'c': 3}]
    };
    
    const file2 = {
      name: "file2.csv",
      path: "./file2.csv",
      columns: ['a1', 'b1', 'c1'],
      preview: [{'a1': 1, 'b1': 2, 'c1': 3}]
    };

    const fileOutput1 = createFileOutput(file1);
    const fileOutput2 = createFileOutput(file2);

    const startState = {
      id: 1,
      nodes: {
        10: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: file1,
          output: [fileOutput1],
          readyStatus: ReadyStatus.OK
        },
        11: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: file2,
          output: [fileOutput2],
          readyStatus: ReadyStatus.OK
	},
        12: {
          type: 'JOIN',
          pos: {x: 0, y: 0},
          config: {
	    how: 'left',
	    join: [['a', 'a1']],
	    suffix: ["_x", "_y"],
	    isDefaultSuffix: true
	  },
          output: [null],
          readyStatus: ReadyStatus.PrevMissing
        },
      },
      edges:[
	{'src': 10, 'srcPort': 0, 'dst': 12, 'dstPort': 0}
      ],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };

    const expected = {
      id: 1,
      nodes: {
        10: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: file1,
          output: [fileOutput1],
          readyStatus: ReadyStatus.OK
        },
        11: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: file2,
          output: [fileOutput2],
          readyStatus: ReadyStatus.OK
	},
        12: {
          type: 'JOIN',
          pos: {x: 0, y: 0},
          config: {
	    how: 'left',
	    join: [['a', 'a1']],
	    suffix: ["_x", "_y"],
	    isDefaultSuffix: true
	  },
          output: [null],
          readyStatus: ReadyStatus.OK
        },
      },
      edges:[
        {'src': 10, 'srcPort': 0, 'dst': 12, 'dstPort': 0},
        {'src': 11, 'srcPort': 0, 'dst': 12, 'dstPort': 0}
      ],
      notes: [],
      focusNodes: [],
      focusEdges: [1],
      focusNotes: []
    };

    expect(reducer(startState, addAction)).toEqual(expected);

    const startState2 = {
      id: 1,
      nodes: {
        10: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: file1,
          output: [fileOutput1],
          readyStatus: ReadyStatus.OK
        },
        11: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: file2,
          output: [fileOutput2],
          readyStatus: ReadyStatus.OK
        },
        12: {
          type: 'JOIN',
          pos: {x: 0, y: 0},
          config: {
	    how: 'left',
            join: [['a', 'a1']],
	    suffix: ["_x", "_y"],
	    isDefaultSuffix: true	    
	  },
          output: [null],
          readyStatus: ReadyStatus.PrevMissing
        },
        13: {
          type: 'JOIN',
          pos: {x: 0, y: 0},
          config: {
	    how: 'left',
	    join: [['a', 'a1']],
	    suffix: ["_x", "_y"],
	    isDefaultSuffix: true	    
	  },
          output: [null],
          readyStatus: ReadyStatus.PrevMissing
        },
      },
      edges:[
        {'src': 10, 'srcPort': 0, 'dst': 12, 'dstPort': 0}
      ],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };

    const expected2 = {
      id: 1,
      nodes: {
        10: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: file1,
          output: [fileOutput1],
          readyStatus: ReadyStatus.OK
        },
        11: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: file2,
          output: [fileOutput2],
          readyStatus: ReadyStatus.OK
        },
        12: {
          type: 'JOIN',
          pos: {x: 0, y: 0},
          config: {
	    how: 'left',
            join: [['a', 'a1']],
	    suffix: ["_x", "_y"],
	    isDefaultSuffix: true
	  },
          output: [null],
          readyStatus: ReadyStatus.OK
        },
        13: {
          type: 'JOIN',
          pos: {x: 0, y: 0},
          config: {
	    how: 'left',
	    join: [['a', 'a1']],
	    suffix: ["_x", "_y"],
	    isDefaultSuffix: true	    
	  },
          output: [null],
          readyStatus: ReadyStatus.PrevMissing
        },
      },
      edges:[
        {'src': 10, 'srcPort': 0, 'dst': 12, 'dstPort': 0},
        {'src': 11, 'srcPort': 0, 'dst': 12, 'dstPort': 0}
      ],
      notes: [],
      focusNodes: [],
      focusEdges: [1],
      focusNotes: []
    };

    expect(reducer(startState2, addAction)).toEqual(expected2);


    const file3 = {
      name: "file3.csv",
      path: "./file3.csv",
      columns: ['a', 'b', 'c', 'a1', 'b1', 'c1'],
      preview: [{'a': 1, 'b': 2, 'c': 2, 'a1': 1, 'b1': 2, 'c1': 3}]
    };

    const addAction3 = actions.addEdge({'src': 12, 'srcPort': 0, 'dst': 13, 'dstPort': 0});
    const fileOutput3 = createFileOutput(file3);
    
    const startState3 = {
      id: 1,
      nodes: {
        10: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: file1,
          output: [fileOutput1],
          readyStatus: ReadyStatus.OK
        },
        11: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: file2,
          output: [fileOutput2],
          readyStatus: ReadyStatus.OK
        },
        12: {
          type: 'JOIN',
          pos: {x: 0, y: 0},
          config: {
	    how: 'left',
            join: [['a', 'a1']],
	    suffix: ["_x", "_y"],
	    isDefaultSuffix: true	    
	  },
          output: [fileOutput3],
          readyStatus: ReadyStatus.OK
        },
        13: {
          type: 'JOIN',
          pos: {x: 0, y: 0},
          config: {
	    how: 'left',
	    join: [['a', 'a1']],
	    suffix: ["_x_13", "_y_13"],
	    isDefaultSuffix: true	    
	  },
          output: [null],
          readyStatus: ReadyStatus.PrevMissing
        },
      },
      edges:[
        {'src': 10, 'srcPort': 0, 'dst': 12, 'dstPort': 0},
        {'src': 11, 'srcPort': 0, 'dst': 12, 'dstPort': 0},
        {'src': 10, 'srcPort': 0, 'dst': 13, 'dstPort': 0}
      ],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };

    const expected3 = {
      id: 1,
      nodes: {
        10: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: file1,
          output: [fileOutput1],
          readyStatus: ReadyStatus.OK
        },
        11: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: file2,
          output: [fileOutput2],
          readyStatus: ReadyStatus.OK
        },
        12: {
          type: 'JOIN',
          pos: {x: 0, y: 0},
          config: {
	    how: 'left',
            join: [['a', 'a1']],
	    suffix: ["_x", "_y"],
	    isDefaultSuffix: true	    
	  },
          output: [fileOutput3],
          readyStatus: ReadyStatus.OK
        },
        13: {
          type: 'JOIN',
          pos: {x: 0, y: 0},
          config: {
	    how: 'left',
	    join: [['a', 'a1']],
	    suffix: ["_x_13", "_y_13"],
	    isDefaultSuffix: true	    
	  },
          output: [null],
          readyStatus: ReadyStatus.OK
        },
      },
      edges:[
        {'src': 10, 'srcPort': 0, 'dst': 12, 'dstPort': 0},
        {'src': 11, 'srcPort': 0, 'dst': 12, 'dstPort': 0},
        {'src': 10, 'srcPort': 0, 'dst': 13, 'dstPort': 0},
        {'src': 12, 'srcPort': 0, 'dst': 13, 'dstPort': 0}
      ],
      notes: [],
      focusNodes: [],
      focusEdges: [3],
      focusNotes: []
    };

    expect(reducer(startState3, addAction3)).toEqual(expected3);
  });
  
  it('should handle is ready status on SET_CONFIG action.', () => {
    const configAction = actions.setConfig(12, {
      how: "left",
      join: [['a1', 'a1']],
      suffix: ["_x", "_y"],
      isDefaultSuffix: true	         
    });
    
    const file1 = {
      name: "file1.csv",
      path: "data/file1.csv",
      columns: ['a', 'b', 'c'],
      preview: [{'a': 1, 'b': 2, 'c': 3}]
    };
    
    const file2 = {
      name: "file2.csv",
      path: "data/file2.csv",
      columns: ['a1', 'b1', 'c1'],
      preview: [{'a1': 1, 'b1': 2, 'c1': 3}]
    };

    const file3 = {
      name: "file3.csv",
      path: "./file3.csv",
      columns: ['a', 'b', 'c', 'a1', 'b1', 'c1'],
      preview: [{'a': 1, 'b': 2, 'c': 2, 'a1': 1, 'b1': 2, 'c1': 3}]
    };

    const fileOutput1 = createFileOutput(file1);
    const fileOutput2 = createFileOutput(file2);
    const fileOutput3 = createFileOutput(file3);
    
    const startState1 = {
      id: 1,
      nodes: {
	10: {
          type: 'LOAD_FILE', 
          pos: {x: 0, y: 0},
          config: fileOutput1,
          output: [fileOutput1],
          readyStatus: ReadyStatus.OK
        },
	11: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: fileOutput2,
          output: [fileOutput2],
          readyStatus: ReadyStatus.OK
        },
	12: {
          type: 'JOIN',
          pos: {x: 0, y: 0},
          config: {
	    how: "left",
	    join: [['a', 'a1']],
	    suffix: ["_x", "_y"],
	    isDefaultSuffix: true	    
	  },
          output: [fileOutput3],
          readyStatus: ReadyStatus.OK
        },
	13: {
          type: 'JOIN',
          pos: {x: 0, y: 0},
          config: {
	    how: "left",
	    join: [['a', 'a1']],
	    suffix: ["_x", "_y"],
	    isDefaultSuffix: true
	  },
          output: [null],
          readyStatus: ReadyStatus.OK
        },
      },
      edges:[        
        {'src': 10, 'srcPort':0, 'dst': 12, 'dstPort':0},
        {'src': 10, 'srcPort':0, 'dst': 13, 'dstPort':0},
        {'src': 12, 'srcPort':0, 'dst': 13, 'dstPort':0},
        {'src': 11, 'srcPort':0, 'dst': 12, 'dstPort':0},
      ],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };

    const expected1 = {
      id: 1,
      nodes: {
	10: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: fileOutput1,
	  output: [fileOutput1],
          readyStatus: ReadyStatus.OK
        },
        11: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: fileOutput2,
          output: [fileOutput2],
          readyStatus: ReadyStatus.OK
        },
        12: {
          type: 'JOIN',
          pos: {x: 0, y: 0},
          config: {
	    how: "left",
	    join: [[null, 'a1']],
	    suffix: ["_x", "_y"],
	    isDefaultSuffix: true
	  },
          output: [null],  // config changed, output is no longer valid
          readyStatus: ReadyStatus.Unready
        },
        13: {
          type: 'JOIN',
          pos: {x: 0, y: 0},
          config: {
	    how: "left",
	    join: [['a', 'a1']],
	    suffix: ["_x", "_y"],
	    isDefaultSuffix: true
	  },
	  output: [null],
          readyStatus: ReadyStatus.PrevUnready
        },
      },
      edges:[
        {'src': 10, 'srcPort':0, 'dst': 12, 'dstPort':0},
        {'src': 10, 'srcPort':0, 'dst': 13, 'dstPort':0},
        {'src': 12, 'srcPort':0, 'dst': 13, 'dstPort':0},
        {'src': 11, 'srcPort':0, 'dst': 12, 'dstPort':0},
      ],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };

    expect(reducer(startState1, configAction)).toEqual(expected1);    
  });

  it('should handle update CLEANSE output on SET_CONFIG action for connected LOAD_FILE.', () => {
    const file1 = {
      name: "file1.csv",
      isAvailable: true,
      path: "data/file1.csv",
      lastModified: null,
      columns: ['a', 'b', 'c'],
      preview: [{'a': 1, 'b': 2, 'c': 3}]
    };    
    
    const startState1 = {
      id: 1,
      nodes: {
	10: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: null,
          output: null,
          readyStatus: ReadyStatus.Unready
        },
	11: {
          type: 'CLEANSE',
          pos: {x: 0, y: 0},
          config: {transformations: [], deleted: []},
          output: null,
          readyStatus: ReadyStatus.PrevUnready
        },
      },
      edges:[
	{'src': 10, 'srcPort':0, 'dst': 11, 'dstPort':0},
      ],
      notes: [],
      focusNodes: [10],
      focusEdges: [],
      focusNotes: []
    };

    const expected1 = {
      id: 1,
      nodes: {
	10: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: file1,
          output: [file1],
          readyStatus: ReadyStatus.OK
        },
	11: {
          type: 'CLEANSE',
          pos: {x: 0, y: 0},
          config: {transformations: [], deleted: []},
          output: [{
            columns: file1.columns,
            name: "CleanseData11",
            path: null,
            lastModified: null,
            preview: file1.preview,
          }],
          readyStatus: ReadyStatus.OK
        },
      },
      edges:[
	{'src': 10, 'srcPort':0, 'dst': 11, 'dstPort':0},
      ],
      notes: [],
      focusNodes: [10],
      focusEdges: [],
      focusNotes: []
    };

    const configAction = actions.setConfig(10, file1);
    const intermediateState = reducer(startState1, configAction)
    const outputAction = actions.setOutput(10, [file1]);
    expect(reducer(intermediateState, outputAction)).toEqual(expected1);
  });

  it('should handle update CLEANSE output on SET_CONFIG action for connected AK_MINE.', () => {
    const file1 = {
      name: "file1.csv",
      isAvailable: true,
      path: "data/file1.csv",
      lastModified: null,
      columns: ['a', 'b', 'c'],
      preview: [{'a': 1, 'b': 2, 'c': 3}]
    };    

    // derived transform
    const derived = {
      attr: "new_derived",
      dependency_list: ["b"],
      enabled: true,
      expr: "b+1",
      idx: 0,
      is_global: true,
      is_visible: false,
      tType: "Derived",
      uid: 8
    };

    const cleanseOutput = {
      columns: [...file1.columns, derived.attr],
      name: "CleanseData11",
      path: null,
      lastModified: null,
      preview: file1.preview
    };

    const mineConfig = {
      options: {is_sample: true, nsamples: 1000 },
	method: "fpminer",
        target: [derived.attr],
        mineType: 'numeric',
        maxPattern : 100,
        threshold : 0.6,
        alpha: 0.05,
        holdout: 1,
        minsup: 0.01,
        nmodels: 15,
        niter: 500,
        nburn: 100,
    };
    
    const startState1 = {
      id: 1,
      nodes: {
	10: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: file1,
          output: [file1],
          readyStatus: ReadyStatus.OK
        },
	11: {
          type: 'CLEANSE',
          pos: {x: 0, y: 0},
          config: {transformations: [derived], deleted: []},
          output: [cleanseOutput],
          readyStatus: ReadyStatus.OK
        },
	12: {
          type: 'AK_MINE',
          pos: {x: 0, y: 0},
          config: {...mineConfig},
          output: [null],
          readyStatus: ReadyStatus.OK
        },
      },
      edges:[
	{'src': 10, 'srcPort':0, 'dst': 11, 'dstPort':0},
	{'src': 11, 'srcPort':0, 'dst': 12, 'dstPort':0},
      ],
      notes: [],
      focusNodes: [11],
      focusEdges: [],
      focusNotes: []
    };

    const expected1 = {
      id: 1,
      nodes: {
	10: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: file1,
          output: [file1],
          readyStatus: ReadyStatus.OK
        },
	11: {
	  type: 'CLEANSE',
          pos: {x: 0, y: 0},
          config: {transformations: [derived], deleted: []},
          output: [cleanseOutput],
          readyStatus: ReadyStatus.OK
        },
	12: {
          type: 'AK_MINE',
          pos: {x: 0, y: 0},
          config: {...mineConfig},
          output: [null],
          readyStatus: ReadyStatus.OK
        },
      },
      edges:[
	{'src': 10, 'srcPort':0, 'dst': 11, 'dstPort':0},
	{'src': 11, 'srcPort':0, 'dst': 12, 'dstPort':0},
      ],
      notes: [],
      focusNodes: [11],
      focusEdges: [],
      focusNotes: []
    };

    // set the config to be the same as it was
    const configAction = actions.setConfig(11, {transformations: [derived], deleted: []});
    
    const intermediateState = reducer(startState1, configAction)
    const outputAction = actions.setOutput(11, [cleanseOutput]);
					   
    expect(reducer(intermediateState, outputAction)).toEqual(expected1);
  });

  it('should handle SET_IS_LOADING action.', () => {    

    const initial = {
      id:1,
      nodes:{
        1:{
          type: 'LOAD_FILE',
          pos:{ x:240, y:194 },
          config:null,
          output:null,
          isLoading: false,
	  readyStatus: ReadyStatus.Unready,
        },
        2:{
          type:'AK_MINE',
          pos:{x:336, y:497},
          config:null,
          output:null,
          isLoading: false,
	  readyStatus: ReadyStatus.Unready,
        }
      },
      edges:[],
      notes: [],
      focusNodes:[2],
      focusEdges:[],
      focusNotes: []
    };


    const expected = {
      id:1,
      nodes:{
        1:{
          type: 'LOAD_FILE',
          pos:{ x:240, y:194 },
          config:null,
          output:null,
          isLoading: false,
	  readyStatus: ReadyStatus.Unready,
        },
        2:{
          type:'AK_MINE',
          pos:{x:336, y:497},
          config:null,
          output:null,
          isLoading: true,
	  readyStatus: ReadyStatus.Unready,
        }
      },
      edges:[],
      notes: [],
      focusNodes:[2],
      focusEdges:[],
      focusNotes: []
    }        

    const setLoadingAction = actions.setIsLoading(2, true);
    expect(reducer(initial, setLoadingAction)).toEqual(expected);
  });
  
  it('should handle SET_FILE_AVAILABLE action.', () => {    
    const initial = {
      id:1,
      nodes:{
        1:{
          type: 'LOAD_FILE', 
          pos: {x: 0, y: 0}, 
          config: {isAvailable: true, file:'stroke.csv', path:'data/stroke.csv'},
          output: null, 
          isLoading: false,
          readyStatus: ReadyStatus.OK
        },
        2:{
          type:'AK_MINE',
          pos:{x:336, y:497},
          config:null,
          output:null,
          isLoading: false,
          readyStatus: ReadyStatus.Unready
        }
      },
      edges:[],
      notes: [],
      focusNodes:[2],
      focusEdges:[],
      focusNotes: []
    };


    const expected = {
      id:1,
      nodes:{
        1:{
          type: 'LOAD_FILE', 
          pos: {x: 0, y: 0}, 
          config: {isAvailable: false, file:'stroke.csv', path:'data/stroke.csv'},
          output: null, 
          isLoading: false,
          readyStatus: ReadyStatus.Unready
        },
        2:{
          type:'AK_MINE',
          pos:{x:336, y:497},
          config:null,
          output:null,
          isLoading: false,
          readyStatus: ReadyStatus.Unready
        }
      },
      edges:[],
      notes: [],
      focusNodes:[2],
      focusEdges:[],
      focusNotes: []
    }        

    const setIsFileAvailableAction = actions.setIsFileAvailable(1, false);
    expect(reducer(initial, setIsFileAvailableAction)).toEqual(expected);
  });

  it('should handle SET_STATE_FROM_FILE action.', () => {    

    const initial = {
      id: 0,
      nodes: {},
      edges: [],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };


    const expected = {
      id:1,
      nodes:{
        1:{
          type: 'LOAD_FILE',
          pos:{ x:240, y:194 },
          config:null,
          output:null,
	  readyStatus: ReadyStatus.Unready,
        },
        2:{
          type:'CLEANSE',
          pos:{x:426, y:307},
          config:{transformations:[]},
          output:null,
	  readyStatus: ReadyStatus.Unready,
        },
        3:{
          type:'AK_MINE',
          pos:{x:336, y:497},
          config:null,
          output:null,
	  readyStatus: ReadyStatus.Unready,
        }
      },
      edges:[],
      notes: [],
      focusNodes:[3],
      focusEdges:[],
      focusNotes: []
    }        

    const setStateFromFileAction = actions.setStateFromFile(expected);
    expect(reducer(initial, setStateFromFileAction)).toEqual(expected);
  });

  it('should handle RESET_STATE action.', () => {    

    const initial = {
      id:1,
      nodes:{
        1:{
          type: 'LOAD_FILE',
          pos:{ x:240, y:194 },
          config:null,
          output:null,
          readyStatus: ReadyStatus.OK
        },
        2:{
          type:'CLEANSE',
          pos:{x:426, y:307},
          config:{transformations:[]},
          output:null,
          readyStatus: ReadyStatus.PrevMissing
        },
        3:{
          type:'AK_MINE',
          pos:{x:336, y:497},
          config:null,
          output:null,
          readyStatus: ReadyStatus.Unready
        }
      },
      edges:[],
      notes: [],
      focusNodes:[3],
      focusEdges:[],
      focusNotes: []
    }    
    
    const expected = {
      id: 0,
      nodes: {},
      edges: [],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };

    const resetStateAction = actions.resetState();
    expect(reducer(initial, resetStateAction)).toEqual(expected);
  });

  it('should handle VALIDATE_CURRENT_STATE action.', () => {    

    const initial = {
      id:1,
      nodes:{
        1:{
          type: 'LOAD_FILE',
          pos:{ x:240, y:194 },
          config:null,
          output:null,
	  readyStatus: ReadyStatus.OK
        },
        2:{
          type:'CLEANSE',
          pos:{x:426, y:307},
          config:{transformations:[]},
          output:null,
	  readyStatus: ReadyStatus.PrevMissing
        },
        3:{
          type:'AK_MINE',
          pos:{x:336, y:497},
          config:null,
          output:null,
	  readyStatus: ReadyStatus.PrevMissing
        }
      },
      edges:[],
      notes: [],
      focusNodes:[3],
      focusEdges:[],
      focusNotes: []
    }   
    
    const expected = {
      id:1,
      nodes:{
        1:{
          type: 'LOAD_FILE',
          pos:{ x:240, y:194 },
          config:null,
          output:null,
          readyStatus: ReadyStatus.Unready
        },
        2:{
          type:'CLEANSE',
          pos:{x:426, y:307},
          config:{transformations:[]},
          output:null,
          readyStatus: ReadyStatus.PrevMissing
        },
        3:{
          type:'AK_MINE',
          pos:{x:336, y:497},
          config:null,
          output:null,
          readyStatus: ReadyStatus.Unready
        }
      },
      edges:[],
      notes: [],
      focusNodes:[3],
      focusEdges:[],
      focusNotes: []
    }   

    const setStateFromFileAction = actions.validateCurrentState();
    expect(reducer(initial, setStateFromFileAction)).toEqual(expected);
  });

  it('should test removing the target attribute in AK_MINE.', () => {    
    const file1 = {
      name: "file1.csv",
      isAvailable: true,
      path: "data/file1.csv",
      lastModified: null,
      columns: ['a', 'b', 'c'],
      preview: [{'a': 1, 'b': 2, 'c': 3}]
    };    

    const preCleanseOutput = {
      columns: ['a', 'b', 'c'],
      name: "CleanseData11",
      path: null,
      lastModified: null,
      preview: file1.preview
    };

    const postCleanseOutput = {
      ...preCleanseOutput,
      columns: ['b', 'c']
    };
    
    const preMineConfig = {
      options: {is_sample: true, nsamples: 1000 },
	method: "fpminer",
        target: ['a'],
        mineType: 'numeric',
        maxPattern : 100,
        threshold : 0.6,
        holdout: 1,
        minsup: 0.01,
        nmodels: 15,
        niter: 500,
        nburn: 100,
    };

    const postMineConfig = {
      ...preMineConfig,
      target: [],      
    };
    
    const startState1 = {
      id: 1,
      nodes: {
	10: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: file1,
          output: [file1],
	  readyStatus: ReadyStatus.OK
        },
	11: {
          type: 'CLEANSE',
          pos: {x: 0, y: 0},
          config: {transformations: [], deleted: []},
          output: [preCleanseOutput],
	  readyStatus: ReadyStatus.OK
        },
	12: {
          type: 'AK_MINE',
          pos: {x: 0, y: 0},
          config: {...preMineConfig},
          output: [null],
	  readyStatus: ReadyStatus.OK
        },
      },
      edges:[
	{'src': 10, 'srcPort':0, 'dst': 11, 'dstPort':0},
	{'src': 11, 'srcPort':0, 'dst': 12, 'dstPort':0},
      ],
      notes: [],
      focusNodes: [11],
      focusEdges: [],
      focusNotes: []
    };
    const expected1 = {
      id: 1,
      nodes: {
	10: {
          type: 'LOAD_FILE',
          pos: {x: 0, y: 0},
          config: file1,
          output: [file1],
	  readyStatus: ReadyStatus.OK
        },
	11: {
	  type: 'CLEANSE',
          pos: {x: 0, y: 0},
          config: {transformations: [], deleted: ['a']},
          output: [postCleanseOutput],
	  readyStatus: ReadyStatus.OK
        },
	12: {
          type: 'AK_MINE',
          pos: {x: 0, y: 0},
          config: {...postMineConfig},
          output: [null],
	  readyStatus: ReadyStatus.Unready
        },
      },
      edges:[
	{'src': 10, 'srcPort':0, 'dst': 11, 'dstPort':0},
	{'src': 11, 'srcPort':0, 'dst': 12, 'dstPort':0},
      ],
      notes: [],
      focusNodes: [11],
      focusEdges: [],
      focusNotes: []
    };
    // set the config to be the same as it was
    const configAction = actions.setConfig(11, {transformations: [], deleted: ['a']});
    
    const intermediateState = reducer(startState1, configAction)
    const outputAction = actions.setOutput(11, [postCleanseOutput]);
					   
    expect(reducer(intermediateState, outputAction)).toEqual(expected1);
  });

  
  it('should handle HANDLE_NODE_ERROR action.', () => {
    const initial = {
      id:1,
      nodes:{
          1: {
            type: 'LOAD_FILE', 
            pos: {x: 0, y: 0},
            config: {
              path:"abc.csv", 
              isAvailable: true,
              options:{
                encoding: 'utf_8',
                delim: ",",
                lineDelim: "",
                headerRow: 0,          
                startLine: 0,  
                escapechar: "",
                comment: "",
                thousands: "",
                decimal: ".",        
                skipEmpty: true,
                naOptions: []
              }
            }, 
            output: null, 
            isLoading: false, 
	    readyStatus: ReadyStatus.OK
          },      
          2:{
            type:'AK_MINE',
            pos:{x:336, y:497},
            config:null,
            output:null,
            isLoading: false,
	    readyStatus: ReadyStatus.OK
          }
      },
      edges:[
        {'src': 1, 'dst': 2},	
      ],
      notes: [],
      focusNodes:[2],
      focusEdges:[],
      focusNotes: []
    };


    const expected = {
      id:1,
      nodes:{
          1: {
            type: 'LOAD_FILE', 
            pos: {x: 0, y: 0},
            config: {
              path:"abc.csv", 
              isAvailable: false,
              options:{
                encoding: 'utf_8',
                delim: ",",
                lineDelim: "",
                headerRow: 0,          
                startLine: 0,  
                escapechar: "",
                comment: "",
                thousands: "",
                decimal: ".",        
                skipEmpty: true,
                naOptions: []
              }
            }, 
            output: null, 
            isLoading: false, 
	    readyStatus: ReadyStatus.Unready
          },      
          2:{
            type:'AK_MINE',
            pos:{x:336, y:497},
            config:null,
            output:null,
            isLoading: false,
	    readyStatus: ReadyStatus.Unready
          }
      },
      edges:[
        {'src': 1, 'dst': 2},	
      ],
      notes: [],
      focusNodes:[2],
      focusEdges:[],
      focusNotes: []
    };

    const handleNodeError = actions.handleNodeError( 1, 'LOAD_FILE', "No such file or directory");
    expect(reducer(initial, handleNodeError)).toEqual(expected);
  });
  
  window.alert.mockClear();
});
