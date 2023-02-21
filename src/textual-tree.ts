
function ttree_converted(data: any): {label: string, branches: any} {
  if ("word" in data) {
    var b: string;
    switch (data.word) {
      case "covert":
        b = "∅";
        break;
      case "functional":
        b = "🅵";
        break;
      default:
        var t = ["", "\u0301", "\u0308", "\u0302"][data.word.tone - 1];
        b = data.word.bare.replace(/[aeıiou]/iu, (v: string) => 
          (v.replace('ı', 'i') + t).normalize("NFD").replace('i', 'ı'));
    }
    return {"label": data.label, "branches": [b]};
  } else {
    return {
      "label": data.label,
      "branches":
        [ttree_converted(data.left), ttree_converted(data.right)]
    };
  }
}

function is_string(v: any) {
  return Object.prototype.toString.call(v) === '[object String]';
}

function textual_tree_of(
  data: {label: string, branches: any},
  pad = ""
) {
  var r = "";
  var nl_pad: string;
  var l = data.branches.length;
  if (l == 1 && is_string(data.branches[0])) {
    r += "─• ";
    nl_pad = pad + "   ";
    r += data.label.replace("\n", "\n" + nl_pad) + " :: ";
    r += data.branches[0].replace("\n", "\n" + nl_pad) + "\n";
    return r;
  } else {
    r += "─┐ ";
    nl_pad = pad + " │ ";
    r += data.label.replace("\n", "\n" + nl_pad) + "\n";
    data.branches.forEach((e: any, i: number) => {
      var a, b: string;
      if (i < l - 1) {
        a = " ├";
        b = " │";
      } else {
        a = " └";
        b = "  ";
      }
      r += pad + a + textual_tree_of(e, pad + b);
    });
    return r;
  }
}

export function textual_tree_from_json(data: any) {
  return textual_tree_of(ttree_converted(data));
}
