function random(array: Array<any>) {
    return array[Math.floor((Math.random()*array.length))];
}

export { random as randomItem }