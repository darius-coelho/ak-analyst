import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';

import VisualizationList from '../../components/causal_explorer/VisualizationList';

import { render, cleanup, screen } from "@testing-library/react";

jest.mock('mixpanel-browser');

describe("Test causal visualization list", () => {
  afterEach(cleanup);

  it("should test visualization list", () => {
    const props = {
      data:[
        {'a': 1, 'b': 2, 'c': 'x'},
        {'a': 2, 'b': 3, 'c': 'y'},
        {'a': 3, 'b': 4, 'c': 'z'},
      ],
      types: {'a': 'Numerical', 'b': 'Numerical', 'c': 'Nominal'},
      edges: [
        {
          sourceAttr: "a",
          sourcePort: "top",
          targetAttr: "b",
          targetPort: "bottom"
        },
        {
          sourceAttr: "b",
          sourcePort: "left",
          targetAttr: "c",
          targetPort: "right"
        }
      ],
      style: {top: 0, left:0, width: 1000, height: 400},
      focusNode: null,
      focusEdge: null
    };

    render(<HashRouter>
            <Switch>
              <Route path='/' >
                <VisualizationList {...props} />
              </Route>
            </Switch>
          </HashRouter>);
          
    expect(screen.queryByText("Visualizations")).toBeTruthy();
    expect(screen.queryAllByText("a")).toHaveLength(1);
    expect(screen.queryAllByText("b")).toHaveLength(2); // Check that b shows up in 2 scatterplots
    expect(screen.queryAllByText("c")).toHaveLength(1);
    expect(screen.queryAllByRole("dataPoint")).toHaveLength(6); // Check data is rendered 2 times
  });
});
