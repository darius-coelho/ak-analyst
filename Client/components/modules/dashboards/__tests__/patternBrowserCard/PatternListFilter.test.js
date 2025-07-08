import React from 'react';
import PatternListFilter from '../../components/patternBrowserCard/PatternListFilter';

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

describe("Test for Pattern List Filter", () => {
  afterEach(cleanup);

  it("should test the initial state", () => {

    const targets = ['attr_0', 'attr_1']
    const targetType = 'numeric'

    const filters = {
          sort: {dim: 'size', direction: 'asc'},
          features: [ 'a2' ],
          numCore: {
                    domain: [2, 5],
                    selected: [3, 4],
                  },
          stat: {
                  [targets[0]]: {
                    domain: [1, 14],
                    selected: [11, 17],
                  },
                  [targets[1]]: {
                    domain: [-3.2, 4.3],
                    selected: [-1.2, 2.3],
                  }
                },
          size: {
                  domain: [0, 100],
                  selected: [23, 88],
                },
        }
    const attributes = ['a1', 'a2', 'a3', 'a4']
    
    const changeFilter = jest.fn();
    const sortList = jest.fn();

    const { container } = render(<PatternListFilter
      target={'attr_1'}
      targetType={targetType}
      listId={0}
      filters={filters}
      changeFilter={changeFilter}
      sortList={sortList}
      attributes={attributes}
    />);
    
    
    // Test switch shown and is off i.e. filter config not shown
    expect(screen.queryByText('Filter Patterns')).toBeTruthy();
    expect(screen.queryByText('Data Size Range:')).toBeFalsy();
    
    // Test filter config shown
    const filtFwitch = screen.queryByTestId('patternListFilterSwitch')
    userEvent.click(filtFwitch);

    // Test data size filter rendered
    expect(screen.queryByText('Data Size Range:')).toBeTruthy();
    // Test Range
    expect(screen.queryByText('0%')).toBeTruthy();
    expect(screen.queryByText('100%')).toBeTruthy();
    //Test selected
    expect(screen.queryByText('23')).toBeTruthy();
    expect(screen.queryByText('88')).toBeTruthy();
    
    // Test mean diff filter rendered
    expect(screen.queryByText('Mean Diff. Range:')).toBeTruthy();
    // Test Range
    expect(screen.queryByText('-3.2')).toBeTruthy();
    expect(screen.queryByText('4.3')).toBeTruthy();
    //Test selected
    expect(screen.queryByText('-1.20')).toBeTruthy();
    expect(screen.queryByText('2.3')).toBeTruthy();

    // Test numCore filter rendered
    expect(screen.queryByText('Number of Core Attributes:')).toBeTruthy();
    // Test Range 
    expect(screen.queryByText('2')).toBeTruthy();
    expect(screen.queryByText('5')).toBeTruthy();
    //Test selected
    expect(screen.queryByText('3')).toBeTruthy();
    expect(screen.queryByText('4')).toBeTruthy();

    // Test core attribute filter rendered
    expect(screen.queryByText('Has Core Attribute:')).toBeTruthy();
    //Test selected
    expect(screen.queryByText('a2')).toBeTruthy();

    // Test sort buttons rendered
    expect(screen.queryByText('Sort By:')).toBeTruthy();
    expect(screen.queryByText('Mean Diff.')).toBeTruthy();
    expect(screen.queryByText('↑')).toBeTruthy();
    expect(screen.queryByText('Data Size')).toBeTruthy();
  });
});
