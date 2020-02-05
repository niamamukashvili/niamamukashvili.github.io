/**
 *
 * @param options
 * @constructor
 */
const SoundScape = function (options) {
    let self = this;
    this.tone = "C3";
    this.sampler = new Tone.Sampler({
        "C3" : "audio/sample1.mp3"
    }).toMaster();
    this.loop = new Tone.Loop(function(time){
        self.sampler.triggerAttack(self.tone, time);
    }, "1n").start(0);


};

SoundScape.prototype.play = function () {
    Tone.Transport.start();
};

SoundScape.prototype.setData = function (data) {

};