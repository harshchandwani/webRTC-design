import { useEffect, useRef, useState } from "react";

export const Sender = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [pc, setPC] = useState<RTCPeerConnection | null>(null);
  const videoContainer = useRef<HTMLDivElement>(null);

  // Establish connection
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080");
    setSocket(socket);
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "sender" }));
    };
  }, []);

  const intialConn = async () => {
    if (!socket) {
      alert("No socket");
      return;
    }

    // Create peer connection and set local description if message.open is 'createAnswer'
    // else if message.open is 'iceCandidate' add ice candidate
    socket.onmessage = async event => {
      const message = JSON.parse(event.data);
      if (message.type === "createAnswer") {
        await pc?.setRemoteDescription(message.sdp);
      } else if (message.type === "iceCandidate") {
        pc?.addIceCandidate(message.candidate);
      }
    };

    // Establishing a P2P connection
    // Exchange the Ice Candidate [See the diagram for more information]
    const pc = new RTCPeerConnection();
    setPC(pc);
    pc.onicecandidate = event => {
      if (event.candidate) {
        socket.send(
          JSON.stringify({ type: "iceCandidate", candidate: event.candidate })
        );
      }
    };

    // Sending Local Description on need (this is used when we share screen or something more)
    pc.onnegotiationneeded = async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket?.send(
        JSON.stringify({
          type: "createOffer",
          sdp: pc.localDescription,
        })
      );
    };

    getCameraStreamAndSend(pc);
  };

  // Use useRef to append the video to the container
  const getCameraStreamAndSend = (pc: RTCPeerConnection) => {
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();
      // Propagate via a component
      videoContainer.current?.appendChild(video);
      stream.getTracks().forEach(track => {
        pc?.addTrack(track);
      });
    });
  };
  return (
    <div>
      Sender
      <button onClick={intialConn}> Send data </button>
    </div>
  );
};
