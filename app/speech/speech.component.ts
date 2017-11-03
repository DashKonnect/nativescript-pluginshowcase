import { Component, NgZone, OnInit, ViewContainerRef } from "@angular/core";
import { animate, state, style, transition, trigger } from "@angular/animations";
import { AbstractMenuPageComponent } from "../abstract-menu-page-component";
import { MenuComponent } from "../menu/menu.component";
import { ModalDialogService } from "nativescript-angular";
import { PluginInfo } from "../shared/plugin-info";
import { PluginInfoWrapper } from "../shared/plugin-info-wrapper";
import { SpeakOptions, TNSTextToSpeech } from "nativescript-texttospeech";
import { SpeechRecognition, SpeechRecognitionTranscription } from "nativescript-speech-recognition";
import { alert, action } from "tns-core-modules/ui/dialogs";
import { available as emailAvailable, compose as composeEmail } from "nativescript-email";
import * as Calendar from "nativescript-calendar";
import * as Camera from "nativescript-camera";
import * as SocialShare from "nativescript-social-share";
import * as ImagePicker from "nativescript-imagepicker";
import { TNSPlayer } from "nativescript-audio";
import { ImageSource } from "tns-core-modules/image-source";
import { isIOS } from "tns-core-modules/platform";
import { Slider } from "tns-core-modules/ui/slider";
import { SelectedIndexChangedEventData } from "nativescript-drop-down";
import { ValueList } from "nativescript-drop-down";
import { NativeScriptHttpModule } from "nativescript-angular/http";
import { Feedback } from "nativescript-feedback";

var googleTranslate = require('google-translate')("696d8f6e86f09e1525c0734c4b41b1cbd7b2bdcd");
var apiai = require('apiai');
var app = apiai("7ff3c98a51fd4664be02a6ec78b52a79");

@Component({
  selector: "page-speech",
  moduleId: module.id,
  templateUrl: "./speech.component.html",
  styleUrls: ["speech-common.css"],
  animations: [
    trigger("from-bottom", [
      state("in", style({
        "opacity": 1,
        transform: "translateY(0)"
      })),
      state("void", style({
        "opacity": 0,
        transform: "translateY(20%)"
      })),
      transition("void => *", [animate("1600ms 700ms ease-out")])
    ]),
    trigger("fade-in-1", [
      state("in", style({
        "opacity": 1
      })),
      state("void", style({
        "opacity": 0
      })),
      transition("void => *", [animate("1100ms 2000ms ease-out")])
    ]),
    trigger("fade-in-2", [
      state("in", style({
        "opacity": 1
      })),
      state("void", style({
        "opacity": 0
      })),
      transition("void => *", [animate("1100ms 2500ms ease-out")])
    ]),
    trigger("scale-in", [
      state("in", style({
        "opacity": 1,
        transform: "scale(1)"
      })),
      state("void", style({
        "opacity": 0,
        transform: "scale(0.9)"
      })),
      transition("void => *", [animate("1100ms ease-out")])
    ])
  ]
})
export class SpeechComponent extends AbstractMenuPageComponent implements OnInit {
  private text2speech: TNSTextToSpeech;
  private speech2text: SpeechRecognition;
  microphoneEnabled: boolean = false;
  recording: boolean = false;
  lastTranscription: string = null;
  spoken: boolean = false;
  showingTips: boolean = false;
  recognizedText: string;
  pitch: number = 100;
  speakRate: number = isIOS ? 50 : 100;
  maxSpeakRate: number = isIOS ? 100 : 200;
  private recordingAvailable: boolean;
  public items: ValueList<string>;
  private feedback: Feedback;


  config = {
    locale: "en-IN", // optional, uses the device locale by default
    // set to true to get results back continuously
    returnPartialResults: true,
    // this callback will be invoked repeatedly during recognition
    onResult: (transcription: SpeechRecognitionTranscription) => {
      this.zone.run(() => this.recognizedText = transcription.text);
      this.lastTranscription = transcription.text;

      googleTranslate.translate('My name is Brandon', this.detectLanguage(this.lastTranscription), function(err, translation) {
        this.lastTranscription = translation.translatedText;

        var request = app.textRequest(transcription.text, {
          sessionId: '123456'
        });
        
        request.on('response', function(response) {
          this.feedback.success({
            title: "Money Sent!",
            message: response,
            duration: 2500,
            // type: FeedbackType.Success, // no need to specify when using 'success' instead of 'show'
            onTap: () => {
              console.log("showSuccess tapped");
            }
          });
        });
        
        request.on('error', function(error) {
            console.log(error);
        });
        
        request.end();

      });
     


      if (transcription.finished) {
        this.spoken = true;
        setTimeout(() => this.speak(transcription.text), 300);
      }
    },
  }

  // @ViewChild("recordButton") recordButton: ElementRef;

  constructor(protected menuComponent: MenuComponent,
              protected vcRef: ViewContainerRef,
              protected modalService: ModalDialogService,
              private zone: NgZone) {
    super(menuComponent, vcRef, modalService);
    this.items = new ValueList<string>([
      { value: "en-IN", display: "English" }, 
      { value: "hi-IN", display: "Hindi" },
      { value: "ml-IN", display: "Malayalam" }
    ]);
    this.feedback = new Feedback();
  }

  public detectLanguage(text: String){
    googleTranslate.detectLanguage('Gracias', function(err, detection) {
      return detection.language;
      // =>  es
    });
  }

  public onchange(args: SelectedIndexChangedEventData) {
      console.log(`Drop Down selected index changed from ${args.oldIndex} to ${args.newIndex}.  New value is ${this.items.getValue(
            args.newIndex)}`);
      this.config.locale = this.items.getValue(args.newIndex);
  }

  public onopen() {
      console.log("Drop Down opened.");
  }

  public onclose() {
      console.log("Drop Down closed.");
  }

  ngOnInit(): void {
    // this creates a touch & hold gesture for the microphone button
    // const recordButton: Label = this.recordButton.nativeElement;
    // recordButton.on("tap", (args: GestureEventData) => {
    //   if (args["action"] === "down") {
    //     this.zone.run(() => this.startListening());
    //   } else if (args["action"] === "up") {
    //     this.zone.run(() => this.stopListening());
    //   }
    // });

    this.speech2text = new SpeechRecognition();
    this.speech2text.available().then(avail => {
      this.recordingAvailable = avail;
    });

    this.text2speech = new TNSTextToSpeech();

    setTimeout(() => {
      this.speech2text.requestPermission().then((granted: boolean) => {
        this.microphoneEnabled = granted;
        if (!isIOS) {
          Camera.requestPermissions();
        }
      });
    }, 1000);
  }

  toggleRecording(): void {
    this.recording = !this.recording;
    if (this.recording) {
      this.spoken = false;
      this.lastTranscription = null;
      this.startListening();
    } else {
      this.stopListening();
      if (!this.spoken && this.lastTranscription !== null) {
        this.speak(this.lastTranscription);
      }
    }
  }

  private startListening(): void {
    if (!this.recordingAvailable) {
      alert({
        title: "Not supported",
        message: "Speech recognition not supported on this device. Try a different device please.",
        okButtonText: "Oh, bummer"
      });
      this.recognizedText = "No support, sorry ☹️";
      return;
    }

    this.recording = true;
    this.speech2text.startListening(this.config).then(
        (started: boolean) => {
          console.log("started listening");
        },
        (errorMessage: string) => {
          console.log(`Error: ${errorMessage}`);
        }
    );
  }

  private stopListening(): void {
    this.recording = false;
    this.speech2text.stopListening().then(() => {
      console.log("Stopped listening");
    });
  }

  private speak(text: string): void {
    let speakOptions: SpeakOptions = {
      text: text,
      speakRate: this.getSpeakRate(),
      pitch: this.getPitch(),
      locale: this.config.locale, // optional, uses the device locale by default
      finishedCallback: () => {
        this.handleFollowUpAction(text.toLowerCase());
      }
    };
    this.text2speech.speak(speakOptions);
  }

  onSpeakRateChange(args): void {
    let slider = <Slider>args.object;
    this.speakRate = Math.floor(slider.value);
    if (this.lastTranscription) {
      this.speak(this.lastTranscription);
    }
  }

  onPitchChange(args): void {
    let slider = <Slider>args.object;
    this.pitch = Math.floor(slider.value);
    if (this.lastTranscription) {
      this.speak(this.lastTranscription);
    }
  }

  /**
   * Poor man's Siri :)
   * @param {string} text (lowercase)
   */
  private handleFollowUpAction(text: string): void {
    if (text.indexOf("schedule") > -1 && text.indexOf("today") > -1) {
      this.findTodaysEvents();

    } else if (text.indexOf("compose") > -1 && text.indexOf("mail") > -1) {
      let subject = "";
      let body = "";
      if (text.indexOf("subject") > -1) {
        let endOfSubject: number;
        if (text.indexOf("an message") > -1) {
          endOfSubject = text.indexOf("an message");
        } else if (text.indexOf("and message") > -1) {
          endOfSubject = text.indexOf("and message");
        } else if (text.indexOf("imessage") > -1) {
          endOfSubject = text.indexOf("imessage");
        }
        subject = text.substring(text.indexOf("subject") + 8, endOfSubject);
      }
      if (text.indexOf("message") > -1) {
        body = text.substring(text.indexOf("message") + 8);
      }
      this.composeAnEmail(subject, body);

    } else if (text.indexOf("share") > -1 && text.indexOf("self") > -1) {
      this.shareSelfie();

    } else if (text.indexOf("kilimanjaro") > -1 || text.indexOf("olympus") > -1 || text.indexOf("serengeti") > -1) {
      // (very) loosely matching the sentence "as sure as kilimannjaro rises like olympus above the serengeti" :)
      this.playTotoAfrica();
    }
  }

  playTotoAfrica(): void {
    let speakOptions: SpeakOptions = {
      text: `That sounds like Toto with Africa${isIOS ? ', right?' : ''}`, // last bit sounds weird on Android
      speakRate: this.getSpeakRate(),
      pitch: this.getPitch(),
      locale: "en-US",
      finishedCallback: () => {
        const player = new TNSPlayer();
        player.playFromFile({
          audioFile: "~/speech/audiofiles/toto-africa-fragment.mp3", // ~ = app directory
          loop: false
        });
      }
    };
    this.text2speech.speak(speakOptions);
  }

  composeAnEmail(subject: string, body: string): void {
    emailAvailable().then(avail => {
      if (!avail) {
        alert({
          title: "Not supported",
          message: "There's no email client configured. Try a different device please.",
          okButtonText: "Ah, makes sense.."
        });
        return;
      }

      composeEmail({
        subject: subject,
        body: body
      }).then((x) => {
        console.log("Email result: " + x);
      });
    });
  }

  shareSelfie(): void {
    let actionOptions: Array<string> = [
      "Fresh pic (camera)",
      "Older pic (camera album)"
    ];

    action(
        "Do you want to take a fresh pic or select an older one?",
        "Cancel",
        actionOptions
    ).then((pickedItem: string) => {
      let pickedItemIndex = actionOptions.indexOf(pickedItem);
      if (pickedItemIndex === 0) {
        // Camera plugin
        if (isIOS) {
          Camera.requestPermissions();
        }

        Camera.takePicture({
          width: 1000,
          height: 1000,
          keepAspectRatio: true,
          saveToGallery: false,
          cameraFacing: "front"
        }).then(imageAsset => {
          new ImageSource().fromAsset(imageAsset).then(imageSource => {
            SocialShare.shareImage(imageSource);
          });
        });
      } else if (pickedItemIndex === 1) {
        // Image Picker plugin
        const imagePicker = ImagePicker.create({
          mode: "single",
          newestFirst: true, // iOS
          doneText: "Done",
          cancelText: "Cancel"
        });
        imagePicker
            .authorize()
            .then(() => {
              return imagePicker.present();
            })
            .then((selection: Array<ImagePicker.SelectedAsset /* which is a subclass of ImageAsset */>) => {
              selection.forEach(selected => {
                selected.getImage({
                  maxWidth: 1000,
                  maxHeight: 1000,
                  aspectRatio: 'fit'
                }).then((imageSource: ImageSource) => {
                  SocialShare.shareImage(imageSource);
                });
              });
            })
            .catch(e => {
              console.log(`Image Picker error: ${e}`);
            });
      }
    });

  }

  findTodaysEvents(): void {
    let now = new Date();
    let midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    Calendar.findEvents({
      startDate: now,
      endDate: midnight
    }).then(
        events => {
          let eventsSpoken = 0;
          events.map(ev => {
            if (!ev.allDay) {
              eventsSpoken++;
              let secondsFromNow = Math.round((ev.startDate.getTime() - new Date().getTime()) / 1000);
              let hours = Math.floor(secondsFromNow / (60 * 60));
              let minutes = Math.round((secondsFromNow / 60) % 60);
              this.text2speech.speak({
                text: `${ev.title} in ${hours > 0 ? hours + ' hour' + (hours > 1 ? 's' : '') + ' and ' : ''} ${minutes} minutes`,
                speakRate: this.getSpeakRate(),
                pitch: this.getPitch()
              });
            }
          });
          if (eventsSpoken === 0) {
            this.text2speech.speak({
              text: `Your schedule is clear. Have a nice day.`,
              locale: "en-US",
              speakRate: this.getSpeakRate(),
              pitch: this.getPitch()
            });
          }
        },
        function (error) {
          console.log(`Error finding Events: ${error}`);
        }
    );
  }

  private getSpeakRate(): number {
    return this.speakRate / 100;
  }

  private getPitch(): number {
    return this.pitch / 100;
  }

  protected getPluginInfo(): PluginInfoWrapper {
    return new PluginInfoWrapper(
        "Always wanted a fully trained parrot?\n\nRecord your voice in the device language and it will be shown and read back to you.\n\nBe sure to try the tips as well!",
        Array.of(
            new PluginInfo(
                "nativescript-texttospeech",
                "Text to Speech",
                "https://github.com/bradmartin/nativescript-texttospeech",
                "Make your app speak. Might be useful for disabled people 👀. Certainly useful for lazy ones."
            ),

            new PluginInfo(
                "nativescript-speech-recognition",
                "Speech Recognition",
                "https://github.com/EddyVerbruggen/nativescript-speech-recognition",
                "Speak to your app 👄. Useful for voice control and silly demo's 😄"
            ),

            new PluginInfo(
                "nativescript-calendar",
                "Calendar  🗓",
                "https://github.com/EddyVerbruggen/nativescript-calendar",
                "Create, Delete and Find Events in the native Calendar"
            ),

            new PluginInfo(
                "nativescript-email",
                "Email  ✉️",
                "https://github.com/EddyVerbruggen/nativescript-email",
                "Open an e-mail draft"
            ),

            new PluginInfo(
                "nativescript-social-share",
                "Social Share  ♻️️",
                "https://github.com/tjvantoll/nativescript-social-share",
                "Use the native sharing widget"
            ),

            new PluginInfo(
                "nativescript-audio",
                "Audio  🎤  🎵",
                "https://github.com/bradmartin/nativescript-audio",
                "NativeScript plugin to record and play audio"
            ),

            new PluginInfo(
                "nativescript-camera",
                "Camera  🎥",
                "https://github.com/NativeScript/nativescript-camera",
                "Grab pictures from the device camera"
            ),

            new PluginInfo(
                "nativescript-imagepicker",
                "Image Picker",
                "https://github.com/NativeScript/nativescript-imagepicker",
                "Select one or more images from the camera roll"
            )
        )
    );
  }
}
