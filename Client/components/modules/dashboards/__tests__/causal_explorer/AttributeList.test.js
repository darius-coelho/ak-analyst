import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';

import AttributeList from '../../components/causal_explorer/AttributeList';

import { render, cleanup, screen } from "@testing-library/react";

jest.mock('mixpanel-browser');

describe("Test Causal Explorer Attribute List", () => {
  afterEach(cleanup);

  it("should test attribute list rendered", () => {

    const props = {      
      attributes: ['a', 'b', 'c'],      
      nodes: {'c': {x: 20, y: 20, inCyle: false}},
      style: {top: 0, left:0, width: 100, height: 300}
    };

    render(<HashRouter>
            <Switch>
              <Route path='/' >
                <AttributeList {...props} />
              </Route>
            </Switch>
          </HashRouter>);  
    
    expect(screen.queryByText("Attributes")).toBeTruthy();
    expect(screen.queryAllByText("a")).toHaveLength(2); // 2 since div + drag image rendered
    expect(screen.queryAllByText("b")).toHaveLength(2);
    expect(screen.queryAllByText("c")).toHaveLength(1); // Drag image not rendered since c is in the node list 
  });
});
