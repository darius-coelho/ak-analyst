import { selectScale, scaleType} from '../components/scale';

import expect from 'expect';

describe('select scale tests', () =>{
  it('select scale time', () => {
    const timeDomain = ['1989-01-01', '1989-01-02', '1989-01-03'];
    const range = [0,10];

    const scaleTime = selectScale(timeDomain, range);
    expect(scaleTime.type).toBe(scaleType.TIME);
    expect(scaleTime.invert(5)).toEqual(new Date('1989-01-02'));
  });

  it('select scale band', () => {
    const domain = ['a', 'b', 'c', 'd'];
    const range = [0,4];

    const scaleBand = selectScale(domain, range);
    expect(scaleBand.type).toBe(scaleType.BAND);
    expect(scaleBand.invert(0)).toBe('a');
    expect(scaleBand.invert(1)).toBe('b');
    expect(scaleBand.invert(2)).toBe('c');
    expect(scaleBand.invert(3)).toBe('d');
  });

  it('select scale linear', () => {
    const domain = [10,11,12,13];
    const range = [0,3];

    const scaleLinear = selectScale(domain, range);
    expect(scaleLinear.type).toBe(scaleType.LINEAR);
    expect(scaleLinear.invert(0)).toBe(10);
    expect(scaleLinear.invert(1)).toBe(11);
    expect(scaleLinear.invert(2)).toBe(12);
    expect(scaleLinear.invert(3)).toBe(13);
  });
});
