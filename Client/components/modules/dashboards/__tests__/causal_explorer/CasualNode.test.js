import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';

import CausalNode from '../../components/causal_explorer/CausalNode';

import { render, cleanup, screen } from "@testing-library/react";

jest.mock('mixpanel-browser');

describe("Test causal node", () => {
  afterEach(cleanup);

  it("should test causal node", () => {    
    const onDragNode = jest.fn();
    const onDropNode = jest.fn();
    const onStartDragEdge = jest.fn();

    const props = {
      name: 'attr_a', 
      x: 10,
      y: 20,
      inCycle: false,
      ate: null,
      onDragNode,
      onDropNode,
      onStartDragEdge
    };

    render(<HashRouter>
            <Switch>
              <Route path='/' >
                <svg>
                  <CausalNode {...props} />
                </svg>
              </Route>
            </Switch>
          </HashRouter>);
    
    expect(screen.queryAllByText("attr_a")).toHaveLength(2);
    expect(screen.queryByRole("node-holder").getAttribute('x')).toEqual(String(props.x-48))
    expect(screen.queryByRole("node-holder").getAttribute('y')).toEqual(String(props.y-21))
    expect(screen.queryByRole("node-holder").getAttribute('width')).toEqual('96')
    expect(screen.queryByRole("node-holder").getAttribute('height')).toEqual('42')
  });

  it("should test causal node w/influence", () => {    
    const onDragNode = jest.fn();
    const onDropNode = jest.fn();
    const onStartDragEdge = jest.fn();

    const props = {
      name: 'attr_a', 
      x: 10,
      y: 20,
      influence: 2.0,
      inCycle: false,
      ate: null,
      onDragNode,
      onDropNode,
      onStartDragEdge     
    };

    render(<HashRouter>
            <Switch>
              <Route path='/' >
                <svg>
                  <CausalNode {...props} />
                </svg>
              </Route>
            </Switch>
          </HashRouter>);
    
    expect(screen.queryAllByText("attr_a")).toHaveLength(2);
    expect(screen.queryByRole("node-holder").getAttribute('x')).toEqual(String(props.x-88))
    expect(screen.queryByRole("node-holder").getAttribute('y')).toEqual(String(props.y-36))
    expect(screen.queryByRole("node-holder").getAttribute('width')).toEqual('176')
    expect(screen.queryByRole("node-holder").getAttribute('height')).toEqual('72')
  });
});
