import React, { useRef, useEffect, useState } from "react";
import styles from "../styles/OpenCamera.module.css";
import cardNames from "../jsons/CardNamesWithPTBR.json";
import Fuse from "fuse.js";

function OpenCamera({ close, fetchName }) {
  const videoRef = useRef(null);
  const photoRef = useRef(null);
  const [hasPhoto, setHasPhoto] = useState(false);
  const photoStyle = hasPhoto ? styles.hasPhoto : styles.noPhoto;
  const mediaStreamRef = useRef(null);


  const getVideo = () => {
    navigator.mediaDevices
      .getUserMedia({
        video: { width: 1920, height: 1080 },
      })
      .then((stream) => {
        mediaStreamRef.current = stream;
        let video = videoRef.current;
        video.srcObject = stream;
        video.play();
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const takePhoto = () => {
    const width = 388;
    const height = 230;

    let video = videoRef.current;
    let photo = photoRef.current;

    photo.width = width;
    photo.height = height;

    let context = photo.getContext('2d');
    context.drawImage(video, 0, 0, width, height);

    setHasPhoto(true);

        // //Using Fuse.js to type tolerance card name search

  // //It's important to note that we're mainly implementing this so to make card scanning work. Webcam will catch the image > Llava will do it's best to return card name > fuse.js will try and find the best match for the result. 

  // //So we won't be working for instance in search suggestions, because it would demand rethinking search by card name, as it's refetching on every input change [useEffect] and it will simply conflict with the search suggestions design, that works best with some 'submit' button to refetch a new search.

  // //Now back to business: we exported a JSON from mySQL db containing only the name of each card (excluding repetitions). We'll be using this JSON in the frontend so we find the best matches for the user input before we look for the card in the DB. 

  const fuse = new Fuse(cardNames, {
    keys: [
      'name', 'portugueseName'
    ], 
    includeScore: true,

  })

  // //fuse.search is the magic - we'll put the input on it and slice it to take out the '&name=' first characters of it.
 const results = fuse.search(`Campo fibrolumina`);
  // //Then we'll bet that the first match is the closest match and we'll store it.
 const cardNameResult = results[0].item.name;
  // //Finally we'll use it in the query.
  fetchName(cardNameResult);
  }

  const stopCamera = () => {

    let photo = photoRef.current;
    let ctx = photo.getContext('2d');
    ctx.clearRect(0, 0, photo.width, photo.height);
    setHasPhoto(false);

    if (mediaStreamRef.current) {
        // Stop all tracks
        const tracks = mediaStreamRef.current.getTracks();
        tracks.forEach(track => track.stop());
        tracks.forEach(track => track.enabled = false);
    
        // Set the media stream reference to null
        mediaStreamRef.current = null;
      }
    close();
  }



  useEffect(() => {
    getVideo();

    return () => {
      if (mediaStreamRef.current) {
        const tracks = mediaStreamRef.current.getTracks();
        tracks.forEach(track => track.stop());
        tracks.forEach(track => track.enabled = false);
      
      // Set the media stream reference to null
      mediaStreamRef.current = null;
      }
    };
  }, []);

  return (
    <div className="col justify-content-center">
      <div className="row">
        <div className="col">
          <video ref={videoRef} className={styles.cam}></video>
        </div>
        <div className="col">
          <canvas className={photoStyle} ref={photoRef}></canvas>
        </div>
      </div>

      <div className="col d-flex justify-content-around">
        <button onClick={takePhoto}>SNAP!</button>
        <button onClick={stopCamera}>CLOSE!</button>
      </div>
    </div>
  );
}

export default OpenCamera;
