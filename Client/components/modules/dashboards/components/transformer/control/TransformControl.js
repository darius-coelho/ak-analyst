import React from 'react';

import FilterControl from './FilterControl';
import ClampControl from './ClampControl';
import NormControl from './NormControl';
import LogControl from './LogControl';
import CustomControl from './CustomControl';

import ReplControl from './ReplControl';
import OHEControl from './OHEControl';
import FilterNominalControl from './FilterNominalControl';
import RankControl from './RankControl';
import CellSplitControl from './CellSplitControl';

/** Component which renders the appropriate control panel for the transforms. */
export function TransformControl(props) {
  const { tType } = props;
  switch(tType) {
    case "Filter": return (
      <FilterControl {...props} />
    );
    case "Clamp": return (
      <ClampControl {...props} />
    );
    case "Norm": return (
      <NormControl {...props} />
    );
    case "Log": return (
      <LogControl {...props} />
    );
    case "Custom": return (
      <CustomControl 
        {...props} 
        placeholder={ "x**2 \n"+
	                    "x[x<10] = x[x<10] + y[x<10] \n"+
	                    "Here x and y should be attribute names"}
      />
    );
    case "Repl": return (
      <ReplControl {...props} />
    );
    case "OHE": return (
      <OHEControl {...props} />
    );
    case "FilterNom": return (
      <FilterNominalControl {...props} />
    );
    case "Rank": return (
      <RankControl {...props} />
    );
    case "CellSplit": return (
      <CellSplitControl {...props} />
    );
    default: return null;
  }
}
