import React, { useEffect } from 'react';
import { init } from './utils/init';

const App = () => {
  useEffect(() => {
    init();
  }, []);

  return (
    <main id='main'>
      <div className='left'></div>
      <div className='right'></div>
    </main>
  );
};

export default App;
