import React from 'react';
import PatternPeek from '../../components/patternBrowserCard/PatternPeek';


import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

describe("Test for Pattern Card Peek", () => {
  afterEach(cleanup);

  it("should test the initial state", () => {
    const style = {
      width: 600,
      height: 700,
      top: 10,
      left: 10
    }
    
    const pattern = {
      ID: 0,
      attributes: {
          attr_1: { min: 5, max: 9, mean: 7.2 },
          attr_2: { min: "-inf", max: "3", mean: 1.2 },
          attr_3: { min: 2, max: 5, mean: 3.2 },
          attr_4: { min: "5", max: "10",  mean: 6.2 },
          attr_5: { min: 1, max: 8, mean: 6.2 }
      },
      core: [ "attr_2", "attr_4" ],
      others: [ "attr_1", "attr_3", "attr_5"],
      shaps: {
        attr_0: [
          { attr: "attr_2", shap: "2.2" },
          { attr: "attr_4", shap: "4.4" }
        ]
      },
      stats: {
        attr_0: {
          size: 31,
          mu: 5.5, sig: "5.2079645706286115",
          min: 1.1, '25%': 2, med: 5.2, '75%': 7, max: 9.5,
          prob: 5, es: -0.85, pval: "1.02e-09"
        }
      },
      name: "Pattern 1",
      tags: ['tag2'],
      filters: {
        attr_1: "Off",
        attr_2: "Off",
        attr_3: "Off",
        attr_4: "Off",
        attr_5: "Off",
      }
    }

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
        attr_1: { min: 0, max: 10, mean: 3.2 },
        attr_2: { min: 0, max: 10, mean: 3.2 },
        attr_3: { min: 0, max: 10, mean: 3.2 },
        attr_4: { min: 0, max: 10, mean: 3.2 },
        attr_5: { min: 0, max: 10, mean: 3.2 }
      }
    }

    const allTags = {
      tag1: "#005500",
      tag2: "#000055"
    }

    const selectedPattern = {
      listID: 0,
      cardID: 0,
    }
    
    const patternSetMin = [
      {name : "Set 1", len: 2},
      {name : "Set 2", len: 0}
    ]
    
    const changePatternName = jest.fn();
    const onChangePatternFilter = jest.fn();
    const toggleAddOutput = jest.fn();
    
    const { container } = render(
      <PatternPeek
        patternSetMin={patternSetMin}
        style={style}
        pattern={pattern}
        selectedPattern={selectedPattern}
        overallSummary={overallSummary}
        target={'attr_0'}
        targetType={'numeric'}
        alpha={0.05}
        catLabels={{}}
        changePatternName={changePatternName}
        changeFilter={onChangePatternFilter}
        likedPatterns={[]}
        toggleAddOutput={toggleAddOutput}
        allTags={allTags}
      />);
    
    // Test name rendered
    expect(screen.queryByText("Pattern 1")).toBeTruthy();

    // Test stats rendered
    expect(screen.queryByText("Count")).toBeTruthy();
    expect(screen.queryByText("31")).toBeTruthy();
    expect(screen.queryByText("Mean")).toBeTruthy();
    expect(screen.queryByText("5.5")).toBeTruthy();
    expect(screen.queryByText("Min.")).toBeTruthy();
    expect(screen.queryByText("1.1")).toBeTruthy();
    expect(screen.queryByText("Max.")).toBeTruthy();
    expect(screen.queryByText("9.5")).toBeTruthy();    
    expect(screen.queryByText("grade")).toBeTruthy();
    expect(screen.queryByText("Sig.")).toBeTruthy();
    expect(screen.queryByText("p < 0.05")).toBeTruthy();


    // Core attributes rendered
    expect(screen.queryByText("Core Features:")).toBeTruthy();
    expect(screen.queryByText("Filter")).toBeTruthy();
    expect(screen.queryAllByText("attr_2").length).toBe(1);
    expect(screen.queryAllByText("attr_4").length).toBe(1);
    expect(container.querySelectorAll("rect").length).toBe(pattern.core.length * 6); // 6 rects per shap attribute

    // Test correct tag rendered
    expect(screen.queryAllByText("tag2").length).toBe(2); // 1 for pattern and 1 for hidden modal
    expect(screen.queryAllByText("tag1").length).toBe(1); // 1 for hidden modal
  });
});
