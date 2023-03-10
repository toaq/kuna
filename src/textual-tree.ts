
function ttree_converted(data: any): {label: string, branches: any} {
  if ("word" in data) {
    var b: string;
    switch (data.word) {
      case "covert":
        b = "β";
        break;
      case "functional":
        b = "π΅";
        break;
      default:
        var t = ["", "\u0301", "\u0308", "\u0302"][data.word.tone - 1];
        b = data.word.bare.replace(/[aeΔ±iou]/iu, (v: string) => 
          (v.replace('Δ±', 'i') + t).normalize("NFD").replace('i', 'Δ±'));
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
    r += "ββ’ ";
    nl_pad = pad + "   ";
    r += data.label.replace("\n", "\n" + nl_pad) + " :: ";
    r += data.branches[0].replace("\n", "\n" + nl_pad) + "\n";
    return r;
  } else {
    r += "ββ ";
    nl_pad = pad + " β ";
    r += data.label.replace("\n", "\n" + nl_pad) + "\n";
    data.branches.forEach((e: any, i: number) => {
      var a, b: string;
      if (i < l - 1) {
        a = " β";
        b = " β";
      } else {
        a = " β";
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
