import React from 'react';
import PatternBubblePlot from '../../../components/patternBrowserCard/charts/PatternBubblePlot';

import {render, cleanup, screen } from "@testing-library/react";

describe("Test for Card Interface Pattern Bubble Plot", () => {
  afterEach(cleanup);

  it("should test the bubble plot", () => {
    
    const target = 'attr_0'
    const features = {
      [target]: [
        { attribute: 'attr_1', score: '1.0', raw_score: '100' },
        { attribute: 'attr_2', score: '0.7', raw_score: '70' },
        { attribute: 'attr_3', score: '0.55', raw_score: '55' },
        { attribute: 'attr_4', score: '0.45', raw_score: '45' },
        { attribute: 'attr_5', score: '0.2', raw_score: '20' }
      ]
    }

    const patternSet = [
      {
        name: "Pinned Patterns",
        patterns:[
          {
            ID: 0,
            attributes: {
              attr_1: { min: "-inf", max: "5", mean: 3.2 },
              attr_2: { min: "1", max: "4", mean: 3.2 },
              attr_3: { min: "5", max: "inf", mean: 3.2 },
              attr_4: { min: 3, max: 7, mean: 3.2 },
              attr_5: { min: 0, max: 10, mean: 3.2 }
            },
            name: 'my_pattern_1',
            core: [ "attr_1", "attr_2"],
            others: [ "attr_3", "attr_4", "attr_5"],
            shaps: {
              [target]: [
                { attr: "attr_3", shap: "0.5" },
                { attr: "attr_4", shap: "0.35" },
                { attr: "attr_5", shap: "0.25" }
              ]
            },
            stats: {
              [target]: {
                size: 30,
                mu: 8, min: 1, med: 7, max: 10,
                sig: 5, prob: -15, es: 0.85, pval: "1.02e-09"
              }
            }
          },
          {
            ID: 1,
            attributes: {
              attr_1: { min: "-inf", max: "5", mean: 3.2 },
              attr_2: { min: "1", max: "4", mean: 3.2 },
              attr_3: { min: "5", max: "inf", mean: 3.2 },
              attr_4: { min: 3, max: 7, mean: 3.2 },
              attr_5: { min: 0, max: 10, mean: 3.2 }
            },
            name: 'my_pattern_1',
            core: ["attr_3", "attr_4"],
            others: [ "attr_1", "attr_2", "attr_5"],
            shaps: {
              [target]: [
                { attr: "attr_1", shap: "0.15" },
                { attr: "attr_2", shap: "0.5" },
                { attr: "attr_5", shap: "0.25" }
              ]
            },
            stats: {
              [target]: {
                size: 90,
                mu: 8, min: 1, med: 7, max: 10,
                sig: 5, prob: -15, es: 0.85, pval: "1.02e-09"
              }
            }
          }
        ]
      },
      {
        name: "Pinned Patterns",
        patterns:[]
      }
    ]
    
    const overallSummary = {
      stats: {
        [target]: {
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

    const { container } = render(
      <PatternBubblePlot
        target={target}
        targetType={'numeric'}
        overallSummary={overallSummary}
        features={features}
        catLabels={{}}
        patternSet={patternSet}
        highlightedFeatures={[]}
        selectedPattern={null}
        onSelectPattern={jest.fn()}
        width={500}
        height={500}
        padding={60}
    />);
    
    // Check Legend rendered
    expect(screen.queryAllByText("Mean Diff.").length).toBe(1);
    expect(screen.queryAllByText("Positive").length).toBe(1);
    expect(screen.queryAllByText("Negative").length).toBe(1);
    expect(screen.queryAllByText("Data Size").length).toBe(1);
    expect(screen.queryAllByText("30").length).toBe(1);
    expect(screen.queryAllByText("60").length).toBe(1);
    expect(screen.queryAllByText("90").length).toBe(1);

    // Chek Y label rendered
    expect(screen.queryAllByText("Target Mean").length).toBe(1);

    // Check X options rendered
    expect(screen.queryAllByText("attr_1").length).toBe(1);
    expect(screen.queryAllByText("attr_2").length).toBe(1);
    expect(screen.queryAllByText("attr_3").length).toBe(1);
    expect(screen.queryAllByText("attr_4").length).toBe(1);
    expect(screen.queryAllByText("attr_5").length).toBe(1);

    // Check points rendered
    expect(container.querySelectorAll("circle").length).toBe(5); // 2 for patterns + 3 for legend
  });
});
