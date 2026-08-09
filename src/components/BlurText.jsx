import { motion } from 'framer-motion';

const BlurText = ({ text, className = "" }) => {
  // Configuración de la animación
  const variants = {
    hidden: { filter: 'blur(10px)', opacity: 0, y: 20 },
    visible: { filter: 'blur(0px)', opacity: 1, y: 0 },
  };

  return (
    <motion.h1
      initial="hidden"
      animate="visible"
      transition={{ duration: 1, ease: "easeOut" }}
      className={className}
    >
      {text}
    </motion.h1>
  );
};

export default BlurText;