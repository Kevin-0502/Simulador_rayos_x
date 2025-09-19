import React, { useState, useRef, useEffect } from "react";
import "./App.css";

const INITIAL_STATE = {
  kv: 75,
  ma: 50,
  inputKv: 75,
  inputMa: 50,
  inputMs: 1000,
  imgPos: { x: 0, y: 0 },
  selectedImage: "http://192.168.2.105:3001/api/abdomen",
  cropRect: null,
};

function App() {
  const canvasRef = useRef(null);
  const [kv, setKv] = useState(INITIAL_STATE.kv);
  const [ma, setMa] = useState(INITIAL_STATE.ma);
  const [inputKv, setInputKv] = useState(INITIAL_STATE.inputKv);
  const [inputMa, setInputMa] = useState(INITIAL_STATE.inputMa);
  const [inputMs, setInputMs] = useState(INITIAL_STATE.inputMs);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [btnSetText, setBtnSetText] = useState("Set");
  const [btnSetColor, setBtnSetColor] = useState("initialColor");
  const [imgPos, setImgPos] = useState(INITIAL_STATE.imgPos);
  const drag = useRef({ dragging: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const img = useRef(new Image());
  const scaleRef = useRef(1);

  // Estados para selección gráfica de recorte en el canvas
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [cropRect, setCropRect] = useState(INITIAL_STATE.cropRect);

  const [selectedImage, setSelectedImage] = useState(INITIAL_STATE.selectedImage);

  useEffect(() => {
    img.current = new Image();
    img.current.crossOrigin = "anonymous";
    img.current.src = selectedImage;
    img.current.onload = () => {
      const canvas = canvasRef.current;

      const maxWidth = window.innerWidth * 0.9;
      let scale = 1;
      if (img.current.width > maxWidth) {
        scale = maxWidth / img.current.width;
      }
      scaleRef.current = scale;

      canvas.width = img.current.width * scale;
      canvas.height = img.current.height * scale;

      const startX = (canvas.width - img.current.width * scale) / 2;
      const startY = (canvas.height - img.current.height * scale) / 2;
      setImgPos({ x: startX, y: startY });

      setImageLoaded(true);
      setCropRect(null); // reset recorte cuando cargue nueva imagen
    };
  }, [selectedImage]);

  const drawImage = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scale = scaleRef.current;
    ctx.save();
    ctx.scale(scale, scale);

    const brightness = ma / 50;
    const contrast = Math.min(3, Math.max(0.1, 120 / kv));
    ctx.filter = `brightness(${brightness}) contrast(${contrast})`;

    ctx.drawImage(img.current, imgPos.x / scale, imgPos.y / scale);
    ctx.restore();

    // Dibujar selección mientras se arrastra
    if (isSelecting && selectionStart && selectionEnd) {
      const rectX = Math.min(selectionStart.x, selectionEnd.x);
      const rectY = Math.min(selectionStart.y, selectionEnd.y);
      const rectWidth = Math.abs(selectionStart.x - selectionEnd.x);
      const rectHeight = Math.abs(selectionStart.y - selectionEnd.y);
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.setLineDash([6]);
      ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
      ctx.setLineDash([]);
    } else if (cropRect) {
      // Mostrar selección fija de recorte con línea azul discontinua
      ctx.strokeStyle = "blue";
      ctx.lineWidth = 2;
      ctx.setLineDash([4]);
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
      ctx.setLineDash([]);
    }
  };

  useEffect(() => {
    if (!imageLoaded) return;
    drawImage();

    const handleResize = () => {
      drawImage();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [kv, ma, imgPos, imageLoaded, isSelecting, selectionStart, selectionEnd, cropRect]);

  const onMouseDown = (e) => {
    if (!e.shiftKey) {
      drag.current.dragging = true;
      drag.current.startX = e.clientX;
      drag.current.startY = e.clientY;
      drag.current.originX = imgPos.x;
      drag.current.originY = imgPos.y;
    } else {
      setIsSelecting(true);
      const rect = canvasRef.current.getBoundingClientRect();
      setSelectionStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setSelectionEnd(null);
    }
  };

  const onMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();

    if (drag.current.dragging && !e.shiftKey) {
      const dx = e.clientX - drag.current.startX;
      const dy = e.clientY - drag.current.startY;
      setImgPos({ x: drag.current.originX + dx, y: drag.current.originY + dy });
    } else if (isSelecting) {
      setSelectionEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const onMouseUp = () => {
    drag.current.dragging = false;
    if (isSelecting && selectionStart && selectionEnd) {
      const x = Math.min(selectionStart.x, selectionEnd.x);
      const y = Math.min(selectionStart.y, selectionEnd.y);
      const width = Math.abs(selectionStart.x - selectionEnd.x);
      const height = Math.abs(selectionStart.y - selectionEnd.y);
      setCropRect({ x, y, width, height });
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  };
  const onMouseLeave = () => {
    drag.current.dragging = false;
    if (isSelecting) {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  };

  // Recortar imagen según selección
  const cropImage = () => {
    if (!cropRect) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const scale = scaleRef.current;

    const sx = (cropRect.x - imgPos.x) / scale;
    const sy = (cropRect.y - imgPos.y) / scale;
    const sw = cropRect.width / scale;
    const sh = cropRect.height / scale;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = sw;
    tempCanvas.height = sh;
    const tempCtx = tempCanvas.getContext("2d");

    const brightness = ma / 50;
    const contrast = Math.min(3, Math.max(0.1, 120 / kv));
    tempCtx.filter = `brightness(${brightness}) contrast(${contrast})`;

    tempCtx.drawImage(img.current, sx, sy, sw, sh, 0, 0, sw, sh);

    const croppedImg = new Image();
    croppedImg.src = tempCanvas.toDataURL("image/png");
    croppedImg.onload = () => {
      img.current = croppedImg;

      const maxWidth = window.innerWidth * 0.9;
      let scale = 1;
      if (croppedImg.width > maxWidth) scale = maxWidth / croppedImg.width;
      scaleRef.current = scale;

      canvas.width = croppedImg.width * scale;
      canvas.height = croppedImg.height * scale;

      setImgPos({ x: 0, y: 0 });
      setCropRect(null);
      setImageLoaded(true);
    };
  };

  const applyValues = () => {
    if (clickCount === 0) {
      setClickCount(1);
      setBtnSetText("Preparation");
      setBtnSetColor("#ffdd00ff");
    } else {
      setBtnSetText("X Ray");
      setBtnSetColor("#ff0000ff");

      setKv(inputKv);
      setMa(inputMa);

      if (cropRect) {
        cropImage();
      }

      setTimeout(() => {
        setClickCount(0);
        setBtnSetText("Set");
        setBtnSetColor("#1d74d7");
      }, inputMs);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      alert("No hay imagen para guardar");
      return;
    }
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "imagen-editada.png";
    link.click();
  };

  const handleReset = () => {
    setKv(INITIAL_STATE.kv);
    setMa(INITIAL_STATE.ma);
    setInputKv(INITIAL_STATE.inputKv);
    setInputMa(INITIAL_STATE.inputMa);
    setInputMs(INITIAL_STATE.inputMs);
    setImgPos(INITIAL_STATE.imgPos);
    setCropRect(INITIAL_STATE.cropRect);
    setSelectedImage(INITIAL_STATE.selectedImage);
    setImageLoaded(false);
  };

  const handleImageChange = (e) => {
    setSelectedImage(e.target.value);
  };

  return (
    <div className="container">
      <div className="left-panel">
        <select onChange={handleImageChange} value={selectedImage} style={{ marginBottom: 10 }}>
          <option value="http://192.168.2.105:3001/api/abdomen">Abdomen</option>
          <option value="http://192.168.2.105:3001/api/cabeza">Cabeza</option>
          <option value="http://192.168.2.105:3001/api/mano">Mano</option>
          <option value="http://192.168.2.105:3001/api/pelvis">Pelvis</option>
          <option value="http://192.168.2.105:3001/api/pie">Pie</option>
          <option value="http://192.168.2.105:3001/api/torax">Tórax</option>
        </select>
        <canvas
          ref={canvasRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          style={{ cursor: isSelecting ? "crosshair" : "grab" }}
        />
      </div>

      <div className="right-panel">
        <div>
          <label>kV (contraste)</label><br />
          <input
            type="number"
            min="10"
            max="120"
            value={inputKv}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val >= 10 && val <= 120) setInputKv(val);
            }}
          />
          <br /><br /><br />

          <label>mA (brillo)</label><br />
          <input
            type="number"
            min="0"
            max="100"
            value={inputMa}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val >= 0 && val <= 100) setInputMa(val);
            }}
          />
          <br /><br />
          <label>ms (milisegundos)</label><br />
          <input
            type="number"
            min="100"
            max="5000"
            value={inputMs}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val >= 100 && val <= 5000) setInputMs(val);
            }}
          />
        </div>

        <div className="button-group">
          <button
            className="btn-set"
            onClick={applyValues}
            style={{ background: btnSetColor }}
            title="Click 'Set' once to prepare, click again to apply with cropping if selected."
          >
            {btnSetText}
          </button>
          <button className="btn-reset" onClick={handleReset}>
            Reset
          </button>
          <button className="btn-save" onClick={handleSave}>
            Guardar Imagen
          </button>
        </div>
        <p style={{ fontSize: 12, marginTop: 10 }}>
          Usa Shift + arrastrar mouse para seleccionar área de recorte en la imagen.
        </p>
      </div>
    </div>
  );
}

export default App;
