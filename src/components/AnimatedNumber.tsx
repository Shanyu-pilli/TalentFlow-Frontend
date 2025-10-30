import React, { useEffect, useState } from 'react';
import { useMotionValue, animate } from 'framer-motion';

type Props = {
  value: number | string;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
};

const AnimatedNumber: React.FC<Props> = ({ value, duration = 0.8, format, className }) => {
  // Hooks must be called unconditionally. We'll decide inside effects whether to animate.
  const motionVal = useMotionValue(0);
  const [display, setDisplay] = useState<number>(0);

  const isNumber = typeof value === 'number';

  useEffect(() => {
    if (!isNumber) {
      // If not numeric, ensure display is zero and stop any animation
      setDisplay(0);
      return;
    }

    const controls = animate(motionVal, value as number, { duration });
    const unsubscribe = motionVal.onChange((v) => setDisplay(Math.round(v)));

    return () => {
      unsubscribe();
      controls.stop();
    };
  }, [isNumber, value, duration, motionVal]);

  if (!isNumber) return <span className={className}>{String(value)}</span>;

  return <span className={className}>{format ? format(display) : display.toLocaleString()}</span>;
};

export default AnimatedNumber;
