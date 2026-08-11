// Se importa en mayúscula porque el eslint del proyecto no tiene
// eslint-plugin-react y no ve los usos dentro de JSX.
import { motion as Motion } from 'framer-motion';

const BlurText = ({ text, className = "" }) => {
  const variants = {
    hidden: { filter: 'blur(10px)', opacity: 0, y: 20 },
    visible: { filter: 'blur(0px)', opacity: 1, y: 0 },
  };

  return (
    <Motion.h1
      // `variants` se declaraba y nunca se pasaba, así que el desenfoque
      // no ocurría: solo se veía el texto aparecer sin transición.
      variants={variants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 1, ease: "easeOut" }}
      className={className}
    >
      {text}
    </Motion.h1>
  );
};

export default BlurText;