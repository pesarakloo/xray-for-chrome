if(new URLSearchParams(location.search).get('set')==='2'){
  const frames=document.querySelectorAll('iframe');
  const panels=[['empty','manage','fa'],['empty','about','en'],['empty','guide','fa']];
  frames.forEach((frame,i)=>{const [scene,tab,lang]=panels[i];frame.src=`/extension/popup/popup.html?scene=${scene}&tab=${tab}&lang=${lang}`;frame.title=tab+' screen';});
}
