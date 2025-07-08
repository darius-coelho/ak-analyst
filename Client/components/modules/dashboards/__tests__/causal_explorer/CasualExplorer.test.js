import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';

import CausalExplorer from '../../components/causal_explorer/CasualExplorer';

import { render, cleanup, screen } from "@testing-library/react";

jest.mock('mixpanel-browser');

describe("Test Causal Explorer", () => {
  afterEach(cleanup);

  it("should test the initial state", () => {    
    const setParams = jest.fn();

    const props = {
      data:[
        {'a': 1, 'b': 2, 'c': 'x'},
        {'a': 2, 'b': 3, 'c': 'y'},
        {'a': 3, 'b': 4, 'c': 'z'},
      ],
      columns: ['a', 'b', 'c'],
      types: {'a': 'Numerical', 'b': 'Numerical', 'c': 'Nominal'},
      config: { 
        nodes: {},
        edges: [] 
      },
      nodesToAdd: [],
      edgesToAdd: [],
      targetNode: null,
      setParams
    };

    render(<HashRouter>
            <Switch>
              <Route path='/' >
                <CausalExplorer {...props} />
              </Route>
            </Switch>
          </HashRouter>);  
    
    expect(screen.queryByText("Attributes")).toBeTruthy();
    expect(screen.queryByText("Visualizations")).toBeTruthy();
    expect(screen.queryAllByText("a")).toHaveLength(2); // 2 since div + drag image rendered
    expect(screen.queryAllByText("b")).toHaveLength(2);
    expect(screen.queryAllByText("c")).toHaveLength(2);
  });
});
