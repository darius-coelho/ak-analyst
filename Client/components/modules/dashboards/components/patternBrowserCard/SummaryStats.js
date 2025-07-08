import React from 'react';
import { abbreviateNumber } from '../../../utilities/utilities';

import './css/SummaryStats.css'

/**
 * Returns the color for a value - red if < 0 and green if >= 0
 * @param {number} val - the value for which the color must be determined
 */
const getColor = (val) => {
  if(val < 0) {
    return "#ce3f3f"
  }
  return "#009a5e"
}

/**
 * Renders the summary stats for numeric targets
 * @param {json} pattern - object containing the selected pattern details.
 * @param {json} overallSummary - Summary of the dataset and mining results 
 */
const NumericSummaryStats = (props) => {
  const { alpha, pattern, overallSummary }  = props
 
  const diff = {
    size: 100 * (+pattern.size/+overallSummary.size),
    mu: pattern.mu - overallSummary.mu,
    sig: pattern.sig - overallSummary.sig,
    min: pattern.min - overallSummary.min,
    med: pattern.med - overallSummary.med,
    max: pattern.max - overallSummary.max,
  }

  return (
    <div className={`summaryStatBox`}>
      <div className={`summaryStat`}>
        <div className={`summaryStatLbl`}>Count</div>
        <div className={`summaryStatVal`}>{abbreviateNumber(parseInt(pattern.size), 2)}</div>
        <div className={`summaryStatDiff`}>{diff.size.toFixed(2) + "% of total"}</div>
      </div>
      <div className={`summaryStat`}>
        <div className={`summaryStatLbl`}>Mean</div>
        <div className={`summaryStatVal`}>{isNaN(pattern.mu) ? 'NA' : abbreviateNumber(pattern.mu, 2)}</div>
        <div className={`summaryStatDiff`} style={{color: getColor(diff.mu)}}>
          {`${diff.mu > 0 ? '+' : ''}${isNaN(diff.mu) ? 'NA' : abbreviateNumber(diff.mu, 2)}`}
        </div>
      </div>
      <div className={`summaryStat`}>
        <div className={`summaryStatLbl`}>Std.</div>
        <div className={`summaryStatVal`}>{isNaN(pattern.sig) ? 'NA' : abbreviateNumber(pattern.sig, 2)}</div>
        <div className={`summaryStatDiff`} style={{color: getColor(diff.sig)}}>
          {`${diff.sig > 0 ? '+' : ''}${isNaN(diff.sig) ? 'NA' : abbreviateNumber(diff.sig, 2)}`}
        </div>
      </div>
      <div className={`summaryStat`}>
        <div className={`summaryStatLbl`}>Min.</div>
        <div className={`summaryStatVal`}>{isNaN(pattern.min) ? 'NA' : abbreviateNumber(pattern.min, 2)}</div>
        <div className={`summaryStatDiff`} style={{color: getColor(diff.min)}}>
          {`${diff.min > 0 ? '+' : ''}${isNaN(diff.med) ? 'NA' : abbreviateNumber(diff.min, 2)}`}
        </div>
      </div>      
      <div className={`summaryStat`}>
        <div className={`summaryStatLbl`}>Max.</div>
        <div className={`summaryStatVal`}>{isNaN(pattern.max) ? 'NA' : abbreviateNumber(pattern.max, 2)}</div>
        <div className={`summaryStatDiff`} style={{color: getColor(diff.max)}}>
          {`${diff.max > 0 ? '+' : ''}${isNaN(diff.max) ? 'NA' : abbreviateNumber(diff.max, 2)}`}
        </div>
      </div>
      <div className={`summaryStat`}>
        <div className={`summaryStatLbl`}>p-value</div>
        <div className={`summaryStatVal`}>{isNaN(pattern.pval) ? 'NA' : (+pattern.pval).toFixed(3)}</div>    
        <div className={`summaryStatDiff`} style={{color: getColor(alpha - pattern.pval)}}>
          {pattern.pval > alpha ? 'p > ' : 'p < '}{`${alpha}`}
        </div>
      </div>

    </div>
  );
}

/**
 * Renders the summary stats for binary targets
 * @param {json} pattern - object containing the selected pattern details.
 * @param {json} overallSummary - Summary of the dataset and mining results 
 */
const BinarySummaryStats = (props) => {
  const { alpha, pattern, overallSummary }  = props

  const N1 = Math.round(pattern.prob * pattern.size);
  const N0 =  pattern.size - N1;

  const odds = N1/N0

  const N1Summary = Math.round(overallSummary.prob * overallSummary.size);
  const N0Summary =  overallSummary.size - N1Summary;

  const diff = {
    size: 100 * (+pattern.size/+overallSummary.size),
    N1: N1 - N1Summary,
    N0: N0 - N0Summary,
    prob: (+pattern.prob) - (+overallSummary.prob),
    odds: odds - N1Summary/N0Summary,
  }

  return (
    <div className={`summaryStatBox`}>
      <div className={`summaryStat`}>
        <div className={`summaryStatLbl`}>Count</div>
        <div className={`summaryStatVal`}>{abbreviateNumber(parseInt(pattern.size), 2)}</div>
        <div className={`summaryStatDiff`}>{diff.size.toFixed(2) + "% of total"}</div>
      </div>
      <div className={`summaryStat`}>
        <div className={`summaryStatLbl`}>Count 1</div>
        <div className={`summaryStatVal`}>{isNaN(N1) ? 'NA' : N1}</div>
        <div className={`summaryStatDiff`} style={{color: getColor(diff.N1)}}>
          {`${diff.N1 > 0 ? '+' : ''}${isNaN(diff.N1) ? 'NA' : abbreviateNumber(diff.N1, 2)}`}
        </div>
      </div>
      <div className={`summaryStat`}>
        <div className={`summaryStatLbl`}>Count 0</div>
        <div className={`summaryStatVal`}>{isNaN(N0) ? 'NA' : N0}</div>
        <div className={`summaryStatDiff`} style={{color: getColor(diff.N0)}}>
          {`${diff.N0 > 0 ? '+' : ''}${isNaN(diff.N0) ? 'NA' : abbreviateNumber(diff.N0, 2)}`}
        </div>
      </div>
      <div className={`summaryStat`}>
        <div className={`summaryStatLbl`}>Prob.</div>
        <div className={`summaryStatVal`}>{isNaN(+pattern.prob) ? 'NA' : (+pattern.prob).toFixed(2)}</div>
        <div className={`summaryStatDiff`} style={{color: getColor(diff.prob)}}>
          {`${diff.prob > 0 ? '+' : ''}${isNaN(diff.prob) ? 'NA' : abbreviateNumber(diff.prob, 2)}`}
        </div>
      </div>
      <div className={`summaryStat`}>
        <div className={`summaryStatLbl`}>Odds</div>
        <div className={`summaryStatVal`}>{isNaN(odds) ? 'NA' : odds.toFixed(2)}</div>
        <div className={`summaryStatDiff`} style={{color: getColor(diff.odds)}}>
          {`${diff.odds > 0 ? '+' : ''}${isNaN(diff.odds) ? 'NA' : abbreviateNumber(diff.odds, 2)}`}
        </div>
      </div>
      <div className={`summaryStat`}>
        <div className={`summaryStatLbl`}>p-value</div>
        <div className={`summaryStatVal`}>{isNaN(pattern.pval) ? 'NA' : (+pattern.pval).toFixed(3)}</div>    
        <div className={`summaryStatDiff`} style={{color: getColor(alpha - pattern.pval)}}>
          {pattern.pval > alpha ? 'p > ' : 'p < '}{`${alpha}`}
        </div>  
      </div>
    </div>
  );
}

/**
 * Renders the summary stats of the selected pattern
 * @param {json} pattern - object containing the selected pattern details.
 * @param {json} overallSummary - Summary of the dataset and mining results
 * @param {string} type - The mining target type
 */
const SummaryStats = (props) => {
  if(props.type == 'numeric') {
    return <NumericSummaryStats {...props} />
  }
  else {
    return <BinarySummaryStats {...props} />
  }
}



export default SummaryStats;