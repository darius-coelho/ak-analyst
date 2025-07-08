import * as selectors from '../graph.selectors';
import expect from 'expect';
import { createFileOutput, FILE, ReadyStatus } from '../components/Action.prototype';

window.setImmediate = window.setTimeout;

describe("graph selectors", () => {

  it('should empty node lists', () => {
    const startState = {
      id: 1,
      nodes: {},
      edges:[],
      focusNodes: [],
      focusEdges: [],
    };

    const expected = [];
    expect(selectors.selectNodes(startState)).toEqual(expected);
  });
  
  it('should empty edge lists', () => {
    const startState = {
      id: 1,
      nodes: {},
      edges:[],
      focusNodes: [],
      focusEdges: [],
    };

    const expected = [];
    expect(selectors.selectEdges(startState)).toEqual(expected);
  });

  it('should empty note lists', () => {
    const startState = {
      id: 1,
      nodes: {},
      edges:[],
      notes: [],
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    };

    const expected = [];
    expect(selectors.selectNotes(startState)).toEqual(expected);
  });

  it('should handle singleton node lists', () => {
    const startState = {
      id: 1,
      nodes: {0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}}},
      edges:[],
      focusNodes: [0],
      focusEdges: [],
    };

    const expected = [
      {ID: 0, focus: true, type: "LOAD_FILE", pos: {x: 0, y: 0}}
    ];
    expect(selectors.selectNodes(startState)).toEqual(expected);
  });

  it('should handle singleton edge lists', () => {
    const startState = {
      id: 1,
      nodes: {
	0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}},
	1: {type: 'LOAD_FILE', pos: {x: 10, y: 0}}
      },
      edges:[{src: 0, dst: 1}],
      focusNodes: [],
      focusEdges: [0],
    };

    const expected = [
      {src: 0, dst: 1, focus: true}
    ];
    expect(selectors.selectEdges(startState)).toEqual(expected);
  });

  it('should handle singleton note lists', () => {
    const startState = {
      id: 1,
      nodes: {},
      edges:[],
      notes: [{
        x: 10,
        y: 10,
        width: 180,
        height: 70,
        content: "test text",
        isEditing: false
      }],
      focusNodes: [],
      focusEdges: [],
      focusNotes: [0]
    };

    const expected = [
      {
        x: 10,
        y: 10,
        width: 180,
        height: 70,
        content: "test text",
        isEditing: false, 
        focus: true        
      }
    ];
    expect(selectors.selectNotes(startState)).toEqual(expected);
  });
  
  it('should handle multiple nodes list', () => {
    const startState = {
      id: 1,
      nodes: {
	0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}},
	1: {type: 'CLEANSE', pos: {x: 0, y: 10}},
	3: {type: 'CLEANSE', pos: {x: 0, y: 0}},	
      },
      edges:[],
      focusNodes: [1],
      focusEdges: [],
    };

    const expected = [
      {ID: 0, focus: false, type: "LOAD_FILE", pos: {x: 0, y: 0}},
      {ID: 1, focus: true, type: "CLEANSE", pos: {x: 0, y: 10}},
      {ID: 3, focus: false, type: "CLEANSE", pos: {x: 0, y: 0}}
    ];
    expect(selectors.selectNodes(startState)).toEqual(expected);
  });


  it('should handle multiple edges list', () => {
    const startState = {
      id: 1,
      nodes: {
	0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}},
	1: {type: 'CLEANSE', pos: {x: 0, y: 10}},
	3: {type: 'CLEANSE', pos: {x: 0, y: 0}},	
      },
      edges:[{src: 0, dst: 1}, {src: 1, dst: 3}],
      focusNodes: [],
      focusEdges: [1],
    };

    const expected = [
      {src: 0, dst: 1, focus: false},
      {src: 1, dst: 3, focus: true}
    ];
    expect(selectors.selectEdges(startState)).toEqual(expected);
  });

  it('should handle multiple note lists', () => {
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
          content: "test text 1",
          isEditing: false
        },
        {
          x: 30,
          y: 30,
          width: 180,
          height: 70,
          content: "test text 2",
          isEditing: false
        }
      ],
      focusNodes: [],
      focusEdges: [],
      focusNotes: [1]
    };

    const expected = [
      {
        x: 10,
        y: 10,
        width: 180,
        height: 70,
        content: "test text 1",
        isEditing: false, 
        focus: false
      },
      {
        x: 30,
        y: 30,
        width: 180,
        height: 70,
        content: "test text 2",
        isEditing: false, 
        focus: true        
      }
    ];
    expect(selectors.selectNotes(startState)).toEqual(expected);
  });

  it('should handle select nodes by type from nodes list', () => {
    const startState = {
      id: 1,
      nodes: {
	0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}},
	1: {type: 'CLEANSE', pos: {x: 0, y: 10}},
	3: {type: 'CLEANSE', pos: {x: 0, y: 0}},	
      },
      edges:[],
      focusNodes: [1],
      focusEdges: [],
    };

    const expected = [      
      {ID: 1, focus: true, type: "CLEANSE", pos: {x: 0, y: 10}},
      {ID: 3, focus: false, type: "CLEANSE", pos: {x: 0, y: 0}}
    ];
    expect(selectors.selectNodes(startState, "CLEANSE")).toEqual(expected);
  });
  
  it('should handle selecting a node by ID', () => {
    const startState = {
      id: 1,
      nodes: {
	0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}},
	1: {type: 'CLEANSE', pos: {x: 0, y: 10}},
	3: {type: 'CLEANSE', pos: {x: 0, y: 0}},	
      },
      edges:[],
      focusNodes: [1],
      focusEdges: [],
    };

    const expected0 = {ID: 0, focus: false, type: "LOAD_FILE", pos: {x: 0, y: 0}};
    const expected1 = {ID: 1, focus: true, type: "CLEANSE", pos: {x: 0, y: 10}};
    const expected3 = {ID: 3, focus: false, type: "CLEANSE", pos: {x: 0, y: 0}};

    expect(selectors.selectNodeByID(startState, 0)).toEqual(expected0);
    expect(selectors.selectNodeByID(startState, 1)).toEqual(expected1);
    expect(selectors.selectNodeByID(startState, 3)).toEqual(expected3);
  });

  it('should handle selecting the focused node or null if none / multiple focus.', () => {
    const state1 = {
      id: 1,
      nodes: {
	0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}, config: null},
	1: {type: 'CLEANSE', pos: {x: 0, y: 10}, config: null},
	3: {type: 'CLEANSE', pos: {x: 0, y: 0}, config: null},	
      },
      edges:[],
      focusNodes: [1],
      focusEdges: [],
    };

    const expected1 = {ID: 1, type: "CLEANSE", input: [], config: null}
    expect(selectors.selectFocusNodeOrNull(state1)).toEqual(expected1);

    const state2 = {
      id: 1,
      nodes: {
	0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}, config: null},
	1: {type: 'CLEANSE', pos: {x: 0, y: 10}, config: {file: 'asdf'}},
	3: {type: 'CLEANSE', pos: {x: 0, y: 0}, config: null},	
      },
      edges:[],
      focusNodes: [1],
      focusEdges: [],
    };

    const expected2 = {ID: 1, type: "CLEANSE", input: [], config: {file: 'asdf'}}
    expect(selectors.selectFocusNodeOrNull(state2)).toEqual(expected2);

    // no focus should return null
    const state3 = {
      id: 1,
      nodes: {
	0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}, config: null},
	1: {type: 'CLEANSE', pos: {x: 0, y: 10}, config: {file: 'asdf'}},
	3: {type: 'CLEANSE', pos: {x: 0, y: 0}, config: null},	
      },
      edges:[],
      focusNodes: [],
      focusEdges: [],
    };

    
    expect(selectors.selectFocusNodeOrNull(state3)).toBeNull();

    
    // multi-focus should return null
    const state4 = {
      id: 1,
      nodes: {
	0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}, config: null},
	1: {type: 'CLEANSE', pos: {x: 0, y: 10}, config: {file: 'asdf'}},
	3: {type: 'CLEANSE', pos: {x: 0, y: 0}, config: null},	
      },
      edges:[],
      focusNodes: [0,1],
      focusEdges: [],
    };
    
    expect(selectors.selectFocusNodeOrNull(state4)).toBeNull();

    const file = {
      name: 'asdf.txt',
      path: './asdf.txt',
      columns: ['a', 'b'],
      preview: [{'a': 1, 'b': 2}]
    };
    
    const output = createFileOutput(file);
    
    // focus with edges should return the inputs
    const state5 = {
      id: 1,
      nodes: {
	0: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  config: file,
	  output: output,
	  readyStatus: ReadyStatus.OK,
	  outPort: 0
	},
	1: {
	  type: 'CLEANSE',
	  pos: {x: 0, y: 10},
	  config: null,
	  readyStatus: ReadyStatus.OK,
	  outPort: 0
	},
	3: {
	  type: 'CLEANSE',
	  pos: {x: 0, y: 0},
	  config: null,
	  readyStatus: ReadyStatus.OK,
	  outPort: 0
	},	
      },
      edges:[{src: 0, dst: 1, srcPort: 0}],
      focusNodes: [1],
      focusEdges: [],
    };

    const expected5 = {
      ID: 1,
      type: "CLEANSE",
      input: [{
	...output,
        srcId: 0,
        outPort: 0,
	readyStatus: ReadyStatus.OK,
      }],
      config: null,
      readyStatus: ReadyStatus.OK,
    };

    expect(selectors.selectFocusNodeOrNull(state5)).toEqual(expected5);
    
    const output1 = createFileOutput(file);

    const file2 = {...file, name: 'fsda.txt', path: './fsda.txt'};
    const output2 = createFileOutput(file2);
    // focus with edges should return the inputs
    const state6 = {
      id: 1,
      nodes: {
	0: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  output: output1,
	  readyStatus: ReadyStatus.OK,
	  outPort: 0
	},
	1: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 10},
	  output: output2,
	  readyStatus: ReadyStatus.OK,
	  outPort: 0
	},
	3: {
	  type: 'JOIN',
	  pos: {x: 0, y: 0},
	  config: null,
	  readyStatus: ReadyStatus.OK,
	  outPort: 0
	},	
      },
      edges:[{src: 0, dst: 3, srcPort: 0}, {src: 1, dst: 3, srcPort: 0}],
      focusNodes: [3],
      focusEdges: [],
    };

    const expected6 = {
      ID: 3,
      type: "JOIN",
      config: null,
      readyStatus: ReadyStatus.OK,
      input: [{
	...output1,
	srcId: 0,
        outPort: 0,
	readyStatus: ReadyStatus.OK,
      }, {
	...output2,
	srcId: 1,
        outPort: 0,
	readyStatus: ReadyStatus.OK,
      }],
    }
    
    expect(selectors.selectFocusNodeOrNull(state6)).toEqual(expected6);
  });
  
  
  it('should handle path selection singleton', () => {
    const startState = {
      id: 1,
      nodes: {
	0: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: null
	},
	1: {
	  type: 'CLEANSE',
	  pos: {x: 0, y: 10},
	  readyStatus: ReadyStatus.Unready,
	  config: null
	},
	3: {
	  type: 'CLEANSE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: null
	},	
      },
      edges:[{'src': 0, 'dst': 1}],
      focusNodes: [1],
      focusEdges: [],
    };

    const expected = {
      ID: 3,
      type: 'CLEANSE',
      config: null,
      readyStatus: ReadyStatus.Unready,      
      input: []
    };
    expect(selectors.selectPathTo(startState, 3)).toEqual(expected);
  });


  it('should handle path selection single edge', () => {
    const startState = {
      id: 1,
      nodes: {
	0: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: null
	},
	1: {
	  type: 'CLEANSE',
	  pos: {x: 0, y: 10},
	  readyStatus: ReadyStatus.Unready,
	  config: {file: 'asdf'}
	},
	3: {
	  type: 'CLEANSE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: null
	},	
      },
      edges:[{'src': 0, 'dst': 1}],
      focusNodes: [1],
      focusEdges: [],
    };
    
    const expected = {
      ID: 1,
      type: 'CLEANSE',
      readyStatus: ReadyStatus.Unready,
      config: {file: 'asdf'},
      input: [
	{ID: 0, type: 'LOAD_FILE', readyStatus: ReadyStatus.Unready, config: null, input: []}
      ]
    };
    expect(selectors.selectPathTo(startState, 1)).toEqual(expected);
  });

  it('should handle path selection multiple edges', () => {
    const startState = {
      id: 1,
      nodes: {
	0: {
	  type: 'LOAD_FILE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.Unready,
	  config: null
	},
	1: {
	  type: 'CLEANSE',
	  pos: {x: 0, y: 10},
	  readyStatus: ReadyStatus.PrevUnready,
	  config: {file: 'asdf'}
	},
	3: {
	  type: 'CLEANSE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.PrevUnready,
	  config: null
	},
	4: {
	  type: 'CLEANSE',
	  pos: {x: 0, y: 0},
	  readyStatus: ReadyStatus.PrevUnready,
	  config: null
	},	
      },
      edges:[{'src': 0, 'dst': 3}, {'src': 1, 'dst': 3}, {'src': 3, 'dst': 4}],
      focusNodes: [],
      focusEdges: [],
    };
      
    const expected = {
      ID: 4,
      type: 'CLEANSE',
      readyStatus: ReadyStatus.PrevUnready,     
      config: null,
      input: [
        {
	  ID: 3,
	  type: 'CLEANSE',
	  readyStatus: ReadyStatus.PrevUnready,
	  config: null,
	  input: [
            {
	      ID: 0,
	      type: 'LOAD_FILE',
	      readyStatus: ReadyStatus.Unready,
	      config: null,
	      input: []
	    },
            {
	      ID: 1,
	      type: "CLEANSE",
	      readyStatus: ReadyStatus.PrevUnready,
	      config: {file: 'asdf'},
	      input: []
	    }
          ]}
      ]
    };
    
    expect(selectors.selectPathTo(startState, 4)).toEqual(expected);
  });

  it('should handle getting valid source types', () => {
    const startState = {
      id: 1,
      nodes: {
	0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}, config: null},
	1: {type: 'CLEANSE', pos: {x: 0, y: 10}, config: {file: 'asdf'}},
	3: {type: 'LOAD_FILE', pos: {x: 0, y: 0}, config: null},
	4: {type: 'CLEANSE', pos: {x: 0, y: 0}, config: null},	
      },
      edges:[{'src': 0, 'dst': 3}, {'src': 1, 'dst': 3}, {'src': 3, 'dst': 4}],
      focusNodes: [],
      focusEdges: [],
    };

    expect(selectors.selectValidSourceTypes(startState, 1)).toEqual([FILE]);
    expect(selectors.selectValidSourceTypes(startState, 4)).toEqual([]);
  });

  it('should handle getting descendant node IDs', () => {
    const startState = {
      id: 1,
      nodes: {
	0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}, config: null},
	1: {type: 'CLEANSE', pos: {x: 0, y: 10}, config: {file: 'asdf'}},
	3: {type: 'LOAD_FILE', pos: {x: 0, y: 0}, config: null},
	4: {type: 'CLEANSE', pos: {x: 0, y: 0}, config: null},	
      },
      edges:[{'src': 0, 'dst': 3}, {'src': 1, 'dst': 3}, {'src': 3, 'dst': 4}],
      focusNodes: [],
      focusEdges: [],
    };

    expect(selectors.selectDescendantIDs(startState, 0)).toEqual([3, 4]);
    expect(selectors.selectDescendantIDs(startState, 1)).toEqual([3, 4]);
    expect(selectors.selectDescendantIDs(startState, 3)).toEqual([4]);
    expect(selectors.selectDescendantIDs(startState, 4)).toEqual([]);
    
    const startState2 = {
      id: 1,
      nodes: {
	0: {type: 'LOAD_FILE', pos: {x: 0, y: 0}, config: null},
	1: {type: 'CLEANSE', pos: {x: 0, y: 10}, config: {file: 'asdf'}},
	3: {type: 'LOAD_FILE', pos: {x: 0, y: 0}, config: null},
	4: {type: 'CLEANSE', pos: {x: 0, y: 0}, config: null},	
      },
      edges:[{'src': 0, 'dst': 1},
	     {'src': 0, 'dst': 3},
	     {'src': 1, 'dst': 3},
	     {'src': 3, 'dst': 4}],
      focusNodes: [],
      focusEdges: [],
    };

    expect(selectors.selectDescendantIDs(startState2, 0)).toEqual([1, 3, 4]);
    expect(selectors.selectDescendantIDs(startState2, 1)).toEqual([3, 4]);
    expect(selectors.selectDescendantIDs(startState2, 3)).toEqual([4]);
    expect(selectors.selectDescendantIDs(startState2, 4)).toEqual([]);
  });

});
   
