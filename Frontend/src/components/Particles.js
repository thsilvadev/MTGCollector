import styles from "../styles/Particles.module.css";
import particlesPug from "../pugs/particles.pug";

//use Pug to receive pug HTML
const pug = require("pug");

// Compile the source code
const compiledFunction = pug.compileFile(particlesPug);


const Particles = () => {
  return (
    <div class="animation-wrapper">
      <div class="particle particle-1"></div>
      <div class="particle particle-2"></div>
      <div class="particle particle-3"></div>
      <div class="particle particle-4"></div>
    </div>
  );
};

export default Particles;
