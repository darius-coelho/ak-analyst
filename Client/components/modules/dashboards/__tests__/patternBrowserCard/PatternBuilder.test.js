import React from 'react';
import PatternBuilder from '../../components/patternBrowserCard/PatternBuilder';

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";

describe("Test for Pattern Builder", () => {
  afterEach(cleanup);

  it("should test the initial state", () => {    

    const overallSummary = {
      stats: {
        attr_0: {
          size: 500,
          mu: 5, sig: 8.5,
          min: 0, med: 5, max: 10,
          prob: -5.6
        }
      },
      attributes: {
        attr_1: { min: 0, max: 10, mean: 3.2, counts: [1, 2, 3, 4, 5, 6, 7, 8], bins: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
        attr_2: { min: 0, max: 10, mean: 3.2, counts: [1, 2, 3, 4, 5, 6, 7, 8], bins: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
        attr_3: { min: 0, max: 10, mean: 3.2, counts: [1, 2, 3, 4, 5, 6, 7, 8], bins: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
        attr_4: { min: 0, max: 10, mean: 3.2, counts: [1, 2, 3, 4, 5, 6, 7, 8], bins: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
        attr_5: { categories: ['cat1', 'cat2', 'cat3'], mostFrequent: 'cat1', catCounts: { cat1: 6, cat2: 7, cat3: 8 } }
      }
    }    

    const catLabels = {
      attr_5: ['cat1', 'cat2', 'cat3']
    }
    
    const buildPattern = jest.fn();
    
    const { container } = render(
      <PatternBuilder
        show={true}
        attributes={overallSummary.attributes}
        target={"targetAttr"}
        targetType={"numeric"}
        catLabels={catLabels}
        buildPattern={buildPattern}
      />
    );
    
    // Test title rendered
    expect(screen.queryByText("New Pattern")).toBeTruthy();

    expect(screen.queryByText("Core Features:")).toBeTruthy();
    

    // Test buttons rendered
    expect(screen.queryByText("Add Feature")).toBeTruthy();    
    expect(screen.queryByText("Add Pattern")).toBeTruthy();    
    expect(screen.queryByText("Cancel")).toBeTruthy();

    // Test chart component rendered
    expect(screen.queryByText("Only show points in filters")).toBeTruthy();
        
  });
});
