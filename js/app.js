/**
 * チケット予約フォーム メインスクリプト (app.js)
 * 
 * - Googleフォーム非表示iframe送信
 * - URLパラメータによる扱いキャスト動的切替 (?cast= または ?performer=)
 * - リアルタイム入力検証（バリデーション）
 * - 券種（一般 / プレミアム）選択対応
 * - 送信前確認モーダル ＆ 完了（サンクス）モーダル
 * - モック送信モード対応
 */

document.addEventListener("DOMContentLoaded", () => {
  const config = window.FORM_CONFIG;
  if (!config) {
    console.error("FORM_CONFIG が読み込まれていません。js/config.js を確認してください。");
    return;
  }
  const info = config.eventInfo;

  // --- 状態管理 ---
  let isSubmitting = false;
  let formSubmitted = false;

  // --- DOM要素の取得 ---
  const bookingForm = document.getElementById("bookingForm");
  const hiddenIframe = document.getElementById("hidden_iframe");
  const mockBanner = document.getElementById("mockBanner");

  // 入力フィールド群
  const inputName = document.getElementById("inputName");
  const inputFurigana = document.getElementById("inputFurigana");
  const inputEmail = document.getElementById("inputEmail");
  const selectSchedule = document.getElementById("selectSchedule");
  const selectTicketType = document.getElementById("selectTicketType");
  const selectTicketCount = document.getElementById("selectTicketCount");
  const inputPerformer = document.getElementById("inputPerformer");
  const inputMessage = document.getElementById("inputMessage");
  const agreeTerms = document.getElementById("agreeTerms");

  // ボタン & スピナー
  const submitBtn = document.getElementById("submitBtn");

  // モーダル関連要素
  const confirmModal = document.getElementById("confirmModal");
  const successModal = document.getElementById("successModal");
  const btnCancelConfirm = document.getElementById("btnCancelConfirm");
  const btnFinalSubmit = document.getElementById("btnFinalSubmit");
  const btnCloseSuccess = document.getElementById("btnCloseSuccess");

  // --- 1. 初期化 & 設定値のDOM反映 ---
  function initPage() {
    // モックモードバナーの表示切り替え
    if (config.isMockMode && mockBanner) {
      mockBanner.style.display = "flex";
    }

    // バージョン番号の反映
    const versionEl = document.getElementById("versionBtn");
    if (versionEl && config.version) {
      versionEl.textContent = config.version;
    }

    // イベント基本情報の反映
    document.title = "ジェットラグ『一身上の都合により』｜チケット予約";
    
    setText("organizerText", info.organizer);
    setText("eventTitleText", info.title);
    setText("creditsText", info.credits);
    setText("eventSubtitleText", info.subtitle);
    if (info.dates) {
      setText("eventDatesText", info.dates);
    }
    setText("venueText", info.venue);
    setText("venueAddressText", info.venueAddress);
    setText("venueAccessText", info.venueAccess);
    setText("ticketPriceText", info.ticketPriceSummary);

    // 会場マップリンク & 公式サイト
    const venueLink = document.getElementById("venueMapLink");
    if (venueLink && info.venueMapUrl) {
      venueLink.href = info.venueMapUrl;
    }
    const officialSiteLink = document.getElementById("officialSiteLink");
    if (officialSiteLink && info.officialUrl) {
      officialSiteLink.href = info.officialUrl;
    }

    // 扱いキャスト（安藤理樹専用・固定）
    const currentPerformer = info.defaultPerformer || "安藤理樹";

    setText("eventSubtitleText", `${currentPerformer}扱い専用 チケット予約フォーム`);
    if (inputPerformer) {
      inputPerformer.value = currentPerformer;
    }

    // 公演日程プルダウンの構築（前日23:59を過ぎた公演は除外）
    if (selectSchedule) {
      selectSchedule.innerHTML = '<option value="">-- ご希望の日時を選択してください --</option>';
      const now = new Date();
      let availableCount = 0;
      info.schedules.forEach((item) => {
        const isExpired = item.deadline ? new Date(item.deadline) < now : false;
        if (!isExpired) {
          const option = document.createElement("option");
          option.value = item.label;
          option.textContent = item.label + (item.available === false ? " (満席)" : "");
          if (item.available === false) {
            option.disabled = true;
          }
          selectSchedule.appendChild(option);
          availableCount++;
        }
      });

      if (availableCount === 0) {
        selectSchedule.innerHTML = '<option value="">-- 全公演の予約受付を終了いたしました --</option>';
        selectSchedule.disabled = true;
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "全公演の予約受付は終了いたしました";
        }
      }
    }

    // 券種プルダウンの構築
    if (selectTicketType && info.ticketTypes) {
      selectTicketType.innerHTML = "";
      if (info.ticketTypes.length > 1) {
        selectTicketType.innerHTML = '<option value="">-- 券種を選択してください --</option>';
      }
      info.ticketTypes.forEach((type, idx) => {
        const option = document.createElement("option");
        option.value = type.label;
        option.textContent = `${type.label} - ${type.price}`;
        if (info.ticketTypes.length === 1) {
          option.selected = true;
        }
        selectTicketType.appendChild(option);
      });
    }

    // 枚数プルダウンの構築（1〜maxTickets）
    if (selectTicketCount) {
      selectTicketCount.innerHTML = '<option value="">-- 枚数を選択してください --</option>';
      const max = info.maxTickets || 4;
      for (let i = 1; i <= max; i++) {
        const option = document.createElement("option");
        option.value = `${i}枚`;
        option.textContent = `${i}枚`;
        selectTicketCount.appendChild(option);
      }
    }

    // 注意事項リストの構築
    const noticeList = document.getElementById("noticeList");
    if (noticeList && info.notices) {
      noticeList.innerHTML = "";
      info.notices.forEach((notice) => {
        const li = document.createElement("li");
        li.innerHTML = notice;
        noticeList.appendChild(li);
      });
    }

    // Googleフォーム entry属性のバインド
    if (bookingForm) {
      bookingForm.action = config.formActionUrl;
      inputName.name = config.fields.name;
      inputFurigana.name = config.fields.furigana;
      inputEmail.name = config.fields.email;
      selectSchedule.name = config.fields.schedule;
      selectTicketType.name = config.fields.ticketType;
      selectTicketCount.name = config.fields.ticketCount;
      if (config.fields && config.fields.performer) {
        inputPerformer.name = config.fields.performer;
      } else {
        inputPerformer.removeAttribute("name");
      }
      inputMessage.name = config.fields.message;
    }
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // --- 2. バリデーション（入力検証） ---
  function validateEmail(email) {
    const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
    return re.test(email);
  }

  function setError(inputElement, errorElementId, message) {
    const group = inputElement.closest(".form-group");
    if (group) group.classList.add("has-error");
    const errEl = document.getElementById(errorElementId);
    if (errEl) errEl.textContent = message;
  }

  function clearError(inputElement, errorElementId) {
    const group = inputElement.closest(".form-group");
    if (group) group.classList.remove("has-error");
    const errEl = document.getElementById(errorElementId);
    if (errEl) errEl.textContent = "";
  }

  // リアルタイムのエラー解消リスナー
  [inputName, inputFurigana, inputEmail, selectSchedule, selectTicketType, selectTicketCount].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", () => {
      const errId = el.getAttribute("aria-describedby");
      clearError(el, errId);
    });
    el.addEventListener("change", () => {
      const errId = el.getAttribute("aria-describedby");
      clearError(el, errId);
    });
  });

  function validateAll() {
    // スパムボット対策: ハニーポットに値が入っている場合は送信処理を無効化
    const hpField = document.getElementById("formWebsiteUrl");
    if (hpField && hpField.value.trim() !== "") {
      console.warn("Spam submission blocked by honeypot.");
      return false;
    }

    let isValid = true;
    let firstErrorEl = null;

    // 氏名
    if (!inputName.value.trim()) {
      setError(inputName, "nameError", "お名前を入力してください。");
      isValid = false;
      if (!firstErrorEl) firstErrorEl = inputName;
    } else {
      clearError(inputName, "nameError");
    }

    // フリガナ
    if (!inputFurigana.value.trim()) {
      setError(inputFurigana, "furiganaError", "フリガナを入力してください。");
      isValid = false;
      if (!firstErrorEl) firstErrorEl = inputFurigana;
    } else {
      clearError(inputFurigana, "furiganaError");
    }

    // メールアドレス
    const emailVal = inputEmail.value.trim();
    if (!emailVal) {
      setError(inputEmail, "emailError", "メールアドレスを入力してください。");
      isValid = false;
      if (!firstErrorEl) firstErrorEl = inputEmail;
    } else if (!validateEmail(emailVal)) {
      setError(inputEmail, "emailError", "正しいメールアドレス形式で入力してください。");
      isValid = false;
      if (!firstErrorEl) firstErrorEl = inputEmail;
    } else {
      clearError(inputEmail, "emailError");
    }

    // 観劇日時
    if (!selectSchedule.value) {
      setError(selectSchedule, "scheduleError", "ご希望の日時を選択してください。");
      isValid = false;
      if (!firstErrorEl) firstErrorEl = selectSchedule;
    } else {
      const selectedItem = info.schedules.find((s) => s.label === selectSchedule.value);
      if (selectedItem && selectedItem.deadline && new Date(selectedItem.deadline) < new Date()) {
        setError(selectSchedule, "scheduleError", "選択された公演日時は、前日23:59を過ぎたため予約受付を終了いたしました。");
        isValid = false;
        if (!firstErrorEl) firstErrorEl = selectSchedule;
      } else {
        clearError(selectSchedule, "scheduleError");
      }
    }

    // 券種
    if (!selectTicketType.value) {
      setError(selectTicketType, "ticketTypeError", "券種を選択してください。");
      isValid = false;
      if (!firstErrorEl) firstErrorEl = selectTicketType;
    } else {
      clearError(selectTicketType, "ticketTypeError");
    }

    // チケット枚数
    if (!selectTicketCount.value) {
      setError(selectTicketCount, "ticketCountError", "チケット枚数を選択してください。");
      isValid = false;
      if (!firstErrorEl) firstErrorEl = selectTicketCount;
    } else {
      clearError(selectTicketCount, "ticketCountError");
    }

    // 注意事項への同意
    if (!agreeTerms.checked) {
      alert("注意事項をご確認の上、「上記注意事項を確認しました」にチェックを入れてください。");
      isValid = false;
      if (!firstErrorEl) firstErrorEl = agreeTerms;
    }

    if (!isValid && firstErrorEl) {
      firstErrorEl.focus();
    }

    return isValid;
  }

  // --- 3. 確認モーダルの制御 ---
  bookingForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validateAll()) return;

    // 入力値を確認モーダルへ反映
    setText("confirmName", inputName.value.trim());
    setText("confirmFurigana", inputFurigana.value.trim());
    setText("confirmEmail", inputEmail.value.trim());
    setText("confirmSchedule", selectSchedule.value);
    const selectedTypeOption = selectTicketType.options[selectTicketType.selectedIndex];
    setText("confirmTicketType", selectedTypeOption ? selectedTypeOption.textContent : selectTicketType.value);
    setText("confirmTicketCount", selectTicketCount.value);

    // 合計金額の計算
    const selectedType = info.ticketTypes.find((t) => t.label === selectTicketType.value);
    const unitPrice = selectedType ? (selectedType.priceNum || parseInt(selectedType.price.replace(/[^\d]/g, ""), 10)) : 0;
    const countNum = parseInt(selectTicketCount.value.replace(/[^\d]/g, ""), 10) || 0;
    const totalPrice = unitPrice * countNum;
    setText("confirmTotalPrice", totalPrice > 0 ? `${totalPrice.toLocaleString()}円 (税込)` : "-");

    setText("confirmMessage", inputMessage.value.trim() || "（なし）");

    // 確認モーダルを開く
    confirmModal.classList.add("active");
    confirmModal.setAttribute("aria-hidden", "false");
  });

  // 確認キャンセル
  btnCancelConfirm.addEventListener("click", () => {
    confirmModal.classList.remove("active");
    confirmModal.setAttribute("aria-hidden", "true");
  });

  // --- 4. 送信処理（Googleフォーム POST or モック送信） ---
  btnFinalSubmit.addEventListener("click", () => {
    if (isSubmitting) return;

    // スパムボット対策
    const hpField = document.getElementById("formWebsiteUrl");
    if (hpField && hpField.value.trim() !== "") {
      console.warn("Spam submission blocked by honeypot.");
      return;
    }

    // 送信直前の締切再検証
    const selectedItem = config.eventInfo.schedules.find((s) => s.label === selectSchedule.value);
    if (selectedItem && selectedItem.deadline && new Date(selectedItem.deadline) < new Date()) {
      alert("申し訳ございません。選択された公演日時は、前日23:59を過ぎたため予約受付を終了いたしました。");
      btnFinalSubmit.disabled = false;
      btnCancelConfirm.disabled = false;
      btnFinalSubmit.classList.remove("loading");
      btnFinalSubmit.querySelector(".btn-text").textContent = "この内容で予約を送信する";
      confirmModal.classList.remove("active");
      confirmModal.setAttribute("aria-hidden", "true");
      setError(selectSchedule, "scheduleError", "選択された公演日時は、前日23:59を過ぎたため予約受付を終了いたしました。");
      return;
    }

    isSubmitting = true;

    // ボタンのローディング状態化
    btnFinalSubmit.disabled = true;
    btnCancelConfirm.disabled = true;
    btnFinalSubmit.classList.add("loading");
    btnFinalSubmit.querySelector(".btn-text").textContent = "送信中...";

    if (config.isMockMode) {
      // モックモード: Googleへ送信せずコンソール出力＆タイマーで完了を模倣
      console.log("【Mock Mode】予約データをコンソールに出力します:", {
        performer: inputPerformer.value,
        name: inputName.value,
        furigana: inputFurigana.value,
        email: inputEmail.value,
        schedule: selectSchedule.value,
        ticketType: selectTicketType.value,
        ticketCount: selectTicketCount.value,
        message: inputMessage.value
      });

      setTimeout(() => {
        handleSuccess();
      }, 900);
    } else {
      // 本番モード: 非表示iframeをターゲットにしてフォームをPOST送信
      formSubmitted = true;
      bookingForm.submit();

      // 安全策: iframeのonloadフォールバック
      setTimeout(() => {
        if (formSubmitted && isSubmitting) {
          handleSuccess();
        }
      }, 5000);
    }
  });

  // 非表示iframe の onload 検知
  if (hiddenIframe) {
    hiddenIframe.addEventListener("load", () => {
      if (formSubmitted) {
        handleSuccess();
      }
    });
  }

  // --- 5. 送信成功処理 ---
  function handleSuccess() {
    formSubmitted = false;
    isSubmitting = false;

    // ボタン状態リセット
    btnFinalSubmit.disabled = false;
    btnCancelConfirm.disabled = false;
    btnFinalSubmit.classList.remove("loading");
    btnFinalSubmit.querySelector(".btn-text").textContent = "この内容で予約を送信する";

    // 確認モーダルを閉じる
    confirmModal.classList.remove("active");
    confirmModal.setAttribute("aria-hidden", "true");

    // サンクスモーダルを開く
    successModal.classList.add("active");
    successModal.setAttribute("aria-hidden", "false");

    // スクリーンリーダー通知
    const announceEl = document.getElementById("srAnnounce");
    if (announceEl) {
      announceEl.textContent = "チケットの仮予約申込が完了しました。";
    }

    // フォームのリセット
    bookingForm.reset();
    initPage();
  }

  // サンクスモーダルを閉じる
  if (btnCloseSuccess) {
    btnCloseSuccess.addEventListener("click", () => {
      successModal.classList.remove("active");
      successModal.setAttribute("aria-hidden", "true");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // --- 6. チラシ Lightbox モーダル制御 ---
  const btnOpenLightbox = document.getElementById("btnOpenLightbox");
  const lightboxModal = document.getElementById("lightboxModal");
  const btnCloseLightbox = document.getElementById("btnCloseLightbox");

  function openLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.add("active");
    lightboxModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.remove("active");
    lightboxModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  if (btnOpenLightbox) {
    btnOpenLightbox.addEventListener("click", openLightbox);
  }

  if (btnCloseLightbox) {
    btnCloseLightbox.addEventListener("click", closeLightbox);
  }

  if (lightboxModal) {
    lightboxModal.addEventListener("click", (e) => {
      // 画像自体をクリックした場合は閉じない、外側の暗幕クリックで閉じる
      if (e.target === lightboxModal || e.target.classList.contains("lightbox-wrapper")) {
        closeLightbox();
      }
    });
  }

  // --- 7. アップデート履歴 モーダル & ツールチップ制御 ---
  const versionBtn = document.getElementById("versionBtn");
  const versionTooltip = document.getElementById("versionTooltip");
  const versionTooltipText = document.getElementById("versionTooltipText");
  const changelogModal = document.getElementById("changelogModal");
  const changelogList = document.getElementById("changelogList");
  const btnCloseChangelog = document.getElementById("btnCloseChangelog");
  const btnBottomCloseChangelog = document.getElementById("btnBottomCloseChangelog");

  function initChangelog() {
    if (!window.APP_CHANGELOG || !Array.isArray(window.APP_CHANGELOG) || window.APP_CHANGELOG.length === 0) {
      return;
    }

    const latest = window.APP_CHANGELOG[0];
    if (versionTooltipText && latest) {
      versionTooltipText.textContent = `${latest.version}: ${latest.summary}`;
    }
    if (versionBtn && latest) {
      versionBtn.setAttribute("title", `最新 (${latest.version}): ${latest.summary}\n（クリックで全履歴を表示）`);
    }

    if (changelogList) {
      const ul = document.createElement("ul");
      ul.className = "changelog-timeline";

      window.APP_CHANGELOG.forEach((item, index) => {
        const li = document.createElement("li");
        li.className = "changelog-item" + (index === 0 ? " is-latest" : "");

        const header = document.createElement("div");
        header.className = "changelog-item-header";

        const verSpan = document.createElement("span");
        verSpan.className = "changelog-version";
        verSpan.textContent = item.version;
        header.appendChild(verSpan);

        if (index === 0) {
          const latestBadge = document.createElement("span");
          latestBadge.className = "changelog-badge-latest";
          latestBadge.textContent = "最新";
          header.appendChild(latestBadge);
        }

        if (item.date) {
          const dateSpan = document.createElement("span");
          dateSpan.className = "changelog-date";
          dateSpan.textContent = item.date;
          header.appendChild(dateSpan);
        }

        const pSummary = document.createElement("p");
        pSummary.className = "changelog-summary";
        pSummary.textContent = item.summary;

        li.appendChild(header);
        li.appendChild(pSummary);
        ul.appendChild(li);
      });

      changelogList.innerHTML = "";
      changelogList.appendChild(ul);
    }
  }

  function showVersionTooltip() {
    if (!versionTooltip || !versionBtn) return;
    if (changelogModal && changelogModal.classList.contains("active")) return;

    const rect = versionBtn.getBoundingClientRect();
    versionTooltip.style.display = "flex";
    
    // ツールチップ自体の幅を取得して中央揃え
    const tooltipRect = versionTooltip.getBoundingClientRect();
    const left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    const bottom = window.innerHeight - rect.top + 10;
    
    // 画面端のはみ出し防止
    const boundedLeft = Math.max(12, Math.min(left, window.innerWidth - tooltipRect.width - 12));
    versionTooltip.style.left = `${boundedLeft}px`;
    versionTooltip.style.bottom = `${bottom}px`;
    versionTooltip.style.top = "auto";

    requestAnimationFrame(() => {
      versionTooltip.classList.add("visible");
      versionTooltip.setAttribute("aria-hidden", "false");
    });
  }

  function hideVersionTooltip() {
    if (!versionTooltip) return;
    versionTooltip.classList.remove("visible");
    versionTooltip.setAttribute("aria-hidden", "true");
    setTimeout(() => {
      if (!versionTooltip.classList.contains("visible")) {
        versionTooltip.style.display = "none";
      }
    }, 180);
  }

  function openChangelog() {
    if (!changelogModal) return;
    hideVersionTooltip();
    changelogModal.style.display = "flex";
    changelogModal.classList.add("active");
    changelogModal.setAttribute("aria-hidden", "false");
    if (versionBtn) {
      versionBtn.setAttribute("aria-expanded", "true");
    }
    document.body.style.overflow = "hidden";
  }

  function closeChangelog() {
    if (!changelogModal) return;
    changelogModal.classList.remove("active");
    changelogModal.setAttribute("aria-hidden", "true");
    changelogModal.style.display = "none";
    if (versionBtn) {
      versionBtn.setAttribute("aria-expanded", "false");
    }
    document.body.style.overflow = "";
  }

  if (versionBtn) {
    versionBtn.addEventListener("mouseenter", showVersionTooltip);
    versionBtn.addEventListener("mouseleave", hideVersionTooltip);
    versionBtn.addEventListener("focus", showVersionTooltip);
    versionBtn.addEventListener("blur", hideVersionTooltip);
    versionBtn.addEventListener("click", openChangelog);
    versionBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openChangelog();
      }
    });
  }

  if (btnCloseChangelog) {
    btnCloseChangelog.addEventListener("click", closeChangelog);
  }

  if (btnBottomCloseChangelog) {
    btnBottomCloseChangelog.addEventListener("click", closeChangelog);
  }

  if (changelogModal) {
    changelogModal.addEventListener("click", (e) => {
      if (e.target === changelogModal) {
        closeChangelog();
      }
    });
  }

  // ESCキーでモーダルを閉じる
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (lightboxModal && lightboxModal.classList.contains("active")) {
        closeLightbox();
      } else if (changelogModal && changelogModal.classList.contains("active")) {
        closeChangelog();
      } else if (confirmModal && confirmModal.classList.contains("active")) {
        confirmModal.classList.remove("active");
        confirmModal.setAttribute("aria-hidden", "true");
      }
    }
  });

  // ページ初期化の実行
  initPage();
  initChangelog();
});
