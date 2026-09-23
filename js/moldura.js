// Molduras carregadas como arquivo separado (img/moldura-apoio.png e img/moldura-heleno.png).
// Funciona no servidor real (mesma origem); se testar abrindo o HTML direto (file://),
// o botao de baixar pode falhar por causa de restricao do navegador — nesse caso, teste via um servidor local.

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("moldura-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const input = document.getElementById("moldura-input");
  const botaoBaixar = document.getElementById("moldura-download");
  const aviso = document.getElementById("moldura-aviso");
  const ajuste = document.getElementById("moldura-ajuste");
  const dica = document.getElementById("moldura-dica");
  const zoomInput = document.getElementById("moldura-zoom");
  const botaoReset = document.getElementById("moldura-reset");
  const opcoes = document.querySelectorAll('input[name="moldura-tipo"]');
  const tamanho = canvas.width;

  // No iPhone/iPad, o atributo "download" do link e ignorado pelo Safari
  // (ele so abre a imagem em vez de baixar). Resolvido com a Web Share API:
  // um toque abre a folha de compartilhamento nativa com "Guardar Imagem"
  // direto, sem precisar abrir em aba nova e segurar o dedo na imagem.
  // Em navegadores sem suporte a compartilhar arquivos, cai no fallback antigo.
  const ehIOS =
    /iP(hone|od|ad)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const suportaCompartilharArquivo = !!(navigator.share && navigator.canShare);
  const avisoIOS = document.getElementById("moldura-aviso-ios");
  if (avisoIOS && (ehIOS || suportaCompartilharArquivo)) {
    avisoIOS.hidden = false;
    avisoIOS.textContent = suportaCompartilharArquivo
      ? 'Toque em "Salvar minha foto" e escolha "Guardar Imagem" na tela que abrir.'
      : 'No iPhone: toque em "Abrir foto pra salvar", depois segure a imagem que abrir na tela e toque em "Adicionar à Galeria".';
  }

  // Molduras disponiveis. "circulo" e a abertura circular de cada anel
  // (fracao de "tamanho"): a foto e recortada nesse circulo pra nunca
  // vazar pra fora do anel. "arquivo" e o nome do PNG baixado.
  const MOLDURAS = {
    mariene: {
      dataUri: "img/moldura-apoio.png",
      circulo: { x: 0.499, y: 0.479, r: 0.4 },
      arquivo: "mariene-4431-apoio.png",
    },
    heleno: {
      dataUri: "img/moldura-heleno.png",
      circulo: { x: 0.5, y: 0.492, r: 0.405 },
      arquivo: "mariene-4431-heleno-45500-apoio.png",
    },
  };

  let molduraKey = "mariene";
  let fotoAtual = null;
  let zoomExtra = 1;
  let deslocX = 0;
  let deslocY = 0;
  let arrastando = false;
  let ultimoX = 0;
  let ultimoY = 0;

  // carrega a imagem de cada moldura uma vez
  Object.keys(MOLDURAS).forEach((chave) => {
    const img = new Image();
    img.onload = () => {
      if (chave === molduraKey) desenharMoldura();
    };
    img.src = MOLDURAS[chave].dataUri;
    MOLDURAS[chave].img = img;
  });

  function molduraCorrente() {
    return MOLDURAS[molduraKey];
  }

  function dimensoesFoto() {
    const escala = Math.max(tamanho / fotoAtual.width, tamanho / fotoAtual.height) * zoomExtra;
    return { w: fotoAtual.width * escala, h: fotoAtual.height * escala };
  }

  function limitarDeslocamento() {
    if (!fotoAtual) return;
    const { w, h } = dimensoesFoto();
    const limiteX = Math.max(0, (w - tamanho) / 2);
    const limiteY = Math.max(0, (h - tamanho) / 2);
    deslocX = Math.min(limiteX, Math.max(-limiteX, deslocX));
    deslocY = Math.min(limiteY, Math.max(-limiteY, deslocY));
  }

  function desenharMoldura() {
    const atual = molduraCorrente();
    const cx = tamanho * atual.circulo.x;
    const cy = tamanho * atual.circulo.y;
    const raio = tamanho * atual.circulo.r;

    ctx.clearRect(0, 0, tamanho, tamanho);

    if (fotoAtual) {
      const { w, h } = dimensoesFoto();
      const x = (tamanho - w) / 2 + deslocX;
      const y = (tamanho - h) / 2 + deslocY;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, raio, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(fotoAtual, x, y, w, h);
      ctx.restore();
    } else {
      ctx.fillStyle = "#EAECFB";
      ctx.beginPath();
      ctx.arc(cx, cy, raio, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2D4FFB";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `600 ${Math.round(tamanho * 0.032)}px Aeonik, sans-serif`;
      ctx.fillText("SUA FOTO", cx, cy - tamanho * 0.025);
      ctx.fillText("ENTRA AQUI", cx, cy + tamanho * 0.025);
    }

    const anel = atual.img;
    if (anel && anel.complete && anel.naturalWidth) {
      ctx.drawImage(anel, 0, 0, tamanho, tamanho);
    }
  }

  function atualizarDownload() {
    if (!botaoBaixar) return;
    try {
      const dataUrl = canvas.toDataURL("image/png");
      botaoBaixar.href = dataUrl;
      if (suportaCompartilharArquivo) {
        botaoBaixar.removeAttribute("download");
        botaoBaixar.removeAttribute("target");
        botaoBaixar.textContent = "Salvar minha foto";
      } else if (ehIOS) {
        botaoBaixar.removeAttribute("download");
        botaoBaixar.target = "_blank";
        botaoBaixar.rel = "noopener";
        botaoBaixar.textContent = "Abrir foto pra salvar";
      } else {
        botaoBaixar.download = molduraCorrente().arquivo;
      }
      botaoBaixar.classList.add("pronto");
    } catch (erro) {
      console.error("Nao deu pra gerar o download:", erro);
      if (aviso) {
        aviso.textContent =
          "Nao deu pra preparar o download. Tenta atualizar a pagina e enviar a foto de novo.";
        aviso.style.color = "#FED90E";
        aviso.style.fontWeight = "700";
      }
    }
  }

  function redesenharTudo() {
    limitarDeslocamento();
    desenharMoldura();
    if (fotoAtual) atualizarDownload();
  }

  desenharMoldura();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(desenharMoldura);
  }

  opcoes.forEach((opcao) => {
    opcao.addEventListener("change", () => {
      if (!opcao.checked) return;
      if (MOLDURAS[opcao.value]) molduraKey = opcao.value;
      redesenharTudo();
    });
  });

  if (input) {
    input.addEventListener("change", () => {
      const arquivo = input.files && input.files[0];
      if (!arquivo) return;

      const leitor = new FileReader();
      leitor.onload = (evento) => {
        const img = new Image();
        img.onload = () => {
          fotoAtual = img;
          zoomExtra = 1;
          deslocX = 0;
          deslocY = 0;
          if (zoomInput) zoomInput.value = 100;
          if (ajuste) ajuste.hidden = false;
          if (dica) dica.hidden = false;
          canvas.style.cursor = "grab";
          redesenharTudo();
        };
        img.src = evento.target.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  }

  if (zoomInput) {
    zoomInput.addEventListener("input", () => {
      if (!fotoAtual) return;
      zoomExtra = Number(zoomInput.value) / 100;
      redesenharTudo();
    });
  }

  if (botaoReset) {
    botaoReset.addEventListener("click", () => {
      if (!fotoAtual) return;
      zoomExtra = 1;
      deslocX = 0;
      deslocY = 0;
      if (zoomInput) zoomInput.value = 100;
      redesenharTudo();
    });
  }

  // Fallback se o compartilhamento falhar por algum motivo que nao seja o
  // usuario ter cancelado: dispara um download normal via <a download>.
  // (window.open com URL "data:" e bloqueado por navegadores modernos,
  // entao nao da pra usar isso como fallback.)
  function baixarComoArquivo() {
    const a = document.createElement("a");
    a.href = botaoBaixar.href;
    a.download = molduraCorrente().arquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (botaoBaixar) {
    botaoBaixar.addEventListener("click", (evento) => {
      if (!suportaCompartilharArquivo) return; // deixa o link normal agir (download ou fallback iOS)
      evento.preventDefault();
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const arquivo = new File([blob], molduraCorrente().arquivo, { type: "image/png" });
        if (!navigator.canShare({ files: [arquivo] })) {
          baixarComoArquivo();
          return;
        }
        try {
          await navigator.share({ files: [arquivo] });
        } catch (erro) {
          if (erro.name !== "AbortError") {
            baixarComoArquivo();
          }
        }
      }, "image/png");
    });
  }

  function posicaoCanvas(evento) {
    const retangulo = canvas.getBoundingClientRect();
    const escalaTela = tamanho / retangulo.width;
    return {
      x: (evento.clientX - retangulo.left) * escalaTela,
      y: (evento.clientY - retangulo.top) * escalaTela,
    };
  }

  canvas.addEventListener("pointerdown", (evento) => {
    if (!fotoAtual) return;
    arrastando = true;
    const ponto = posicaoCanvas(evento);
    ultimoX = ponto.x;
    ultimoY = ponto.y;
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture(evento.pointerId);
  });

  canvas.addEventListener("pointermove", (evento) => {
    if (!arrastando || !fotoAtual) return;
    const ponto = posicaoCanvas(evento);
    deslocX += ponto.x - ultimoX;
    deslocY += ponto.y - ultimoY;
    ultimoX = ponto.x;
    ultimoY = ponto.y;
    redesenharTudo();
  });

  function pararArraste() {
    if (!arrastando) return;
    arrastando = false;
    if (fotoAtual) canvas.style.cursor = "grab";
  }

  canvas.addEventListener("pointerup", pararArraste);
  canvas.addEventListener("pointerleave", pararArraste);
  canvas.addEventListener("pointercancel", pararArraste);
});
