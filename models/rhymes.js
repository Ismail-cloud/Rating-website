var input_string = readInputContent();
var data = input_string.split('\n');
var w1 = data[0];
var w2 = data[1];
var p = data[2];

function rhymes(w1, w2, p) {    // YOUR CODE HERE
    // return 1 if the 2 words rhyme
    // else return 0
    var w1_rhymes = w1.substr(w1.length - p);
    var w2_rhymes = w2.substr(w2.length - p);

    console.log(w1_rhymes);
    console.log(w2_rhymes);

    if(w1_rhymes.toLowerCase() == w2_rhymes.toLowerCase()){
        return 1;
    } else {
        return 0;
    }


}


var output = rhymes(w1, w2, p);
printOutput(output);
