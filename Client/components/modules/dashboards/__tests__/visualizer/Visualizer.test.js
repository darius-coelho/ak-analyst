import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';

import Visualizer from "../../components/visualizer/Visualizer"

import { render, cleanup, screen } from "@testing-library/react";

jest.mock('mixpanel-browser');

describe("Test Visualizer", () => {
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
      config: { charts: [] },
      setParams
    };

    render(<HashRouter>
            <Switch>
              <Route path='/' >
                <Visualizer {...props} />
              </Route>
            </Switch>
          </HashRouter>);  
    
    expect(screen.queryByText("Configurator")).toBeTruthy();
    expect(screen.queryByText("Visualizations")).toBeTruthy();
    expect(screen.queryByText("Base Chart")).toBeTruthy();
    expect(screen.queryByText("None")).toBeTruthy();
  });
});
