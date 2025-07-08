import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';

import CausalGraph from '../../components/causal_explorer/CausalGraph';

import { render, cleanup, screen } from "@testing-library/react";

jest.mock('mixpanel-browser');

describe("Test Causal Graph", () => {
  afterEach(cleanup);

  it("should test the initial state", () => {    
    const addNode = jest.fn();
    const onDragNode = jest.fn();
    const onDropNode = jest.fn();

    const props = {
      style: {top: 0, left:0, width: 1000, height: 400},
      gridSide: 30,
      nodes: {
        'a': {x: 10, y: 10, inCyle: false, influence: {}, ate: null},
        'b': {x: 30, y: 30, inCyle: false, influence: {}, ate: null},
        'c': {x: 50, y: 50, inCyle: false, influence: {}, ate: null}
      },
      edges: [
        {
          sourceAttr: "a",
          sourcePort: "top",
          targetAttr: "b",
          targetPort: "bottom",
	  weight: 0.9,
        },
        {
          sourceAttr: "b",
          sourcePort: "left",
          targetAttr: "c",
          targetPort: "right",
	  weight: 0.5
        }
      ],
      addNode,
      onDragNode,
      onDropNode,
    };

    render(<HashRouter>
            <Switch>
              <Route path='/' >
                <CausalGraph {...props} />
              </Route>
            </Switch>
          </HashRouter>);  
    
    // Check nodes rendered
    expect(screen.queryAllByText("a")).toHaveLength(2);
    expect(screen.queryAllByText("b")).toHaveLength(2);
    expect(screen.queryAllByText("c")).toHaveLength(2);

    // Check links rendered
    expect(screen.queryAllByTestId("link")).toHaveLength(2);
  });
});
