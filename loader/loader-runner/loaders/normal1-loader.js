function loader(source) {
  console.log('normal1: normal', source);
  return source + '//normal1';
}

loader.pitch = function () {
  console.log('normal1: pitch');
};

module.exports = loader;
